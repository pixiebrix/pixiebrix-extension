/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { loadOptions } from "@/store/extensionsStorage";
import extensionPointRegistry from "@/extensionPoints/registry";
import { updateNavigationId } from "@/contentScript/context";
import * as sidebar from "@/contentScript/sidebarController";
import { logPromiseDuration, pollUntilTruthy } from "@/utils";
import { NAVIGATION_RULES } from "@/contrib/navigationRules";
import { testMatchPatterns } from "@/blocks/available";
import reportError from "@/telemetry/reportError";
import { compact, groupBy, intersection, once, uniq } from "lodash";
import { resolveExtensionInnerDefinitions } from "@/registry/internal";
import { traces } from "@/background/messenger/api";
import { isDeploymentActive } from "@/utils/deploymentUtils";
import { $safeFind } from "@/helpers";
import { PromiseCancelled } from "@/errors/genericErrors";
import injectScriptTag from "@/utils/injectScriptTag";
import { getThisFrame } from "webext-messenger";
import { type IExtensionPoint } from "@/types/extensionPointTypes";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { RunReason } from "@/types/runtimeTypes";
import { type ResolvedExtension } from "@/types/extensionTypes";
import { type SidebarExtensionPoint } from "@/extensionPoints/sidebarExtension";

/**
 * True if handling the initial page load.
 */
let _initialLoad = true;

/**
 * Map from persisted extension IDs to their extension points.
 *
 * Mutually exclusive with _editorExtensions.
 *
 * @see _editorExtensions
 */
const _persistedExtensions = new Map<UUID, IExtensionPoint>();

/**
 * Map from extension IDs currently being edited in the Page Editor to their extension points.
 *
 * Mutually exclusive with _persistedExtensions.
 *
 * @see _persistedExtensions
 */
const _editorExtensions = new Map<UUID, IExtensionPoint>();

/**
 * Extension points active/installed on the page.
 */
const _activeExtensionPoints = new Set<IExtensionPoint>();

/**
 * Mapping from frame ID to URL. Used to ignore navigation events that don't change the URL.
 */
const _frameHref = new Map<number, string>();

/**
 * Abort controllers for navigation events for Single Page Applications (SPAs).
 */
const _navigationListeners = new Set<() => void>();

/**
 * Reload extension definitions on next navigation
 */
let _reloadOnNextNavigate = false;

const WAIT_LOADED_INTERVAL_MS = 25;

const injectPageScriptOnce = once(async (): Promise<void> => {
  console.debug("Injecting page script");
  const script = await logPromiseDuration(
    "injectPageScript",
    injectScriptTag(browser.runtime.getURL("pageScript.js"))
  );
  script.remove();
});

/**
 * Run an extension point and specified IExtensions.
 * @param extensionPoint the extension point to install/run
 * @param reason the reason code for the run
 * @param extensionIds the IExtensions to run on the extension point, or undefined to run all IExtensions
 * @param abortSignal abort signal to cancel the install/run
 */
async function runExtensionPoint(
  extensionPoint: IExtensionPoint,
  {
    reason,
    extensionIds,
    abortSignal,
  }: { reason: RunReason; extensionIds?: UUID[]; abortSignal: AbortSignal }
): Promise<void> {
  // Could potentially call _activeExtensionPoints.delete here, but assume the extension point is still available
  // until we know for sure that it's not

  let installed = false;

  // Details to make it easier to debug extension point lifecycle
  const details = {
    extensionPointId: extensionPoint.id,
    kind: extensionPoint.kind,
    name: extensionPoint.name,
    permissions: extensionPoint.permissions,
    extensionIds,
    reason,
  };

  try {
    installed = await extensionPoint.install();
  } catch (error) {
    if (error instanceof PromiseCancelled) {
      console.debug(
        `Skipping ${extensionPoint.kind} ${extensionPoint.id} because user navigated away from the page`,
        details
      );

      _activeExtensionPoints.delete(extensionPoint);
      return;
    }

    throw error;
  }

  if (!installed) {
    console.debug(
      `Skipping ${extensionPoint.kind} ${extensionPoint.id} because it was not installed on the page`,
      details
    );

    _activeExtensionPoints.delete(extensionPoint);
    return;
  }

  if (abortSignal.aborted) {
    console.debug(
      `Skipping ${extensionPoint.kind} ${extensionPoint.id} because user navigated away from the page`,
      details
    );

    _activeExtensionPoints.delete(extensionPoint);
    return;
  }

  console.debug(
    `Installed extension point ${extensionPoint.kind}: ${extensionPoint.id}`,
    details
  );

  await extensionPoint.run({ reason, extensionIds });
  _activeExtensionPoints.add(extensionPoint);

  console.debug(
    `Ran extension point ${extensionPoint.kind}: ${extensionPoint.id}`,
    details
  );
}

/**
 * Warn if any lifecycle state assumptions are violated.
 */
function checkLifecycleInvariants(): void {
  const installedIds = [..._persistedExtensions.keys()];
  const editorIds = [..._editorExtensions.keys()];

  if (intersection(installedIds, editorIds).length > 0) {
    console.warn("Installed and editor extensions are not mutually exclusive", {
      installedIds,
      editorIds,
    });
  }
}

/**
 * Returns all the extension points currently running on the page. Includes both persisted extensions and extensions
 * being edited in the Page Editor.
 */
export function getActiveExtensionPoints(): IExtensionPoint[] {
  return [..._activeExtensionPoints];
}

/**
 * Test helper to get internal persisted extension state
 * @constructor
 */
export function TEST_getPersistedExtensions(): Map<UUID, IExtensionPoint> {
  return _persistedExtensions;
}

/**
 * Test helper to get internal editor extension state
 * @constructor
 */
export function TEST_getEditorExtensions(): Map<UUID, IExtensionPoint> {
  return _editorExtensions;
}

/**
 * Remove an extension from an extension point on the page if a persisted extension (i.e. in extensionsSlice)
 */
export function removePersistedExtension(extensionId: UUID): void {
  // Leaving the extension point in _activeExtensionPoints. Could consider removing if this was the last extension
  const extensionPoint = _persistedExtensions.get(extensionId);
  extensionPoint?.removeExtension(extensionId);
  _persistedExtensions.delete(extensionId);
}

/**
 * Remove a page editor extensions extension(s) from the page.
 *
 * NOTE: if the dynamic extension was taking the place of a "permanent" extension, call `reactivate` or a similar
 * method for the extension to be reloaded.
 *
 * NOTE: this works by removing all extensions attached to the extension point. Call `reactivate` or a similar
 * method to re-install the installed extensions.
 *
 * @param extensionId the uuid of the dynamic extension, or undefined to clear all dynamic extensions
 * @param options options to control clear behavior
 */
export function clearEditorExtension(
  extensionId?: UUID,
  options?: { clearTrace?: boolean; preserveSidebar?: boolean }
): void {
  const { clearTrace, preserveSidebar } = {
    clearTrace: true,
    preserveSidebar: false,
    ...options,
  };

  if (extensionId) {
    if (_editorExtensions.has(extensionId)) {
      // Don't need to call _installedExtensionPoints.delete(extensionPoint) here because that tracks non-dynamic
      // extension points
      console.debug(`lifecycle:clearEditorExtension: ${extensionId}`);
      const extensionPoint = _editorExtensions.get(extensionId);

      if (extensionPoint.kind === "actionPanel" && preserveSidebar) {
        const sidebar = extensionPoint as SidebarExtensionPoint;
        // eslint-disable-next-line new-cap -- hack for action panels
        sidebar.HACK_uninstallExceptExtension(extensionId);
      } else {
        extensionPoint.uninstall({ global: true });
      }

      _activeExtensionPoints.delete(extensionPoint);
      _editorExtensions.delete(extensionId);
      sidebar.removeExtension(extensionId);
    } else {
      console.debug(`No dynamic extension exists for uuid: ${extensionId}`);
    }

    if (clearTrace) {
      void traces.clear(extensionId);
    }
  } else {
    for (const extensionPoint of _editorExtensions.values()) {
      try {
        extensionPoint.uninstall({ global: true });
        _activeExtensionPoints.delete(extensionPoint);
        sidebar.removeExtensionPoint(extensionPoint.id);
      } catch (error) {
        reportError(error);
      }
    }

    _editorExtensions.clear();

    if (clearTrace) {
      traces.clearAll();
    }
  }
}

/**
 * Return an AbortSignal that's aborted when the user navigates.
 */
function createNavigationAbortSignal(): AbortSignal {
  const controller = new AbortController();
  _navigationListeners.add(controller.abort.bind(controller));
  return controller.signal;
}

/**
 * Notifies all navigation listeners that the user has navigated in a way that changed the URL.
 */
function notifyNavigationListeners(): void {
  for (const listener of _navigationListeners) {
    listener();
  }

  _navigationListeners.clear();
}

/**
 * Run an extension including unsaved changes from the Page Editor
 * @param extensionId
 * @param extensionPoint
 */
export async function runEditorExtension(
  extensionId: UUID,
  extensionPoint: IExtensionPoint
): Promise<void> {
  // Uninstall the installed extension point instance in favor of the dynamic extensionPoint
  if (_persistedExtensions.has(extensionId)) {
    removePersistedExtension(extensionId);
  }

  // Uninstall the previous extension point instance in favor of the updated extensionPoint
  if (_editorExtensions.has(extensionId)) {
    // Pass preserveSidebar to avoid flickering permanent sidebars
    clearEditorExtension(extensionId, {
      clearTrace: false,
      preserveSidebar: true,
    });
  }

  _editorExtensions.set(extensionId, extensionPoint);

  await runExtensionPoint(extensionPoint, {
    // The Page Editor is the only caller for runDynamic
    reason: RunReason.PAGE_EDITOR,
    extensionIds: [extensionId],
    abortSignal: createNavigationAbortSignal(),
  });

  checkLifecycleInvariants();
}

/**
 * Add extensions to their respective extension points.
 *
 * NOTE: Excludes dynamic extensions that are already on the page via the Page Editor.
 */
async function loadPersistedExtensions(): Promise<IExtensionPoint[]> {
  console.debug("lifecycle:loadPersistedExtensions");
  const options = await logPromiseDuration(
    "loadPersistedExtensions:loadOptions",
    loadOptions()
  );

  // Exclude the following:
  // - disabled deployments: the organization admin might have disabled the deployment because via Admin Console
  // - dynamic extensions: these are already installed on the page via the Page Editor
  const activeExtensions = options.extensions.filter(
    (extension) =>
      isDeploymentActive(extension) && !_editorExtensions.has(extension.id)
  );

  const resolvedExtensions = await logPromiseDuration(
    "loadPersistedExtensions:resolveDefinitions",
    Promise.all(
      activeExtensions.map(async (x) => resolveExtensionInnerDefinitions(x))
    )
  );

  const extensionMap = groupBy(resolvedExtensions, (x) => x.extensionPointId);

  _persistedExtensions.clear();

  const added = compact(
    await Promise.all(
      Object.entries(extensionMap).map(
        async ([extensionPointId, extensions]: [
          RegistryId,
          ResolvedExtension[]
        ]) => {
          try {
            const extensionPoint = await extensionPointRegistry.lookup(
              extensionPointId
            );

            extensionPoint.syncExtensions(extensions);

            // Mark the extensions as installed
            for (const extension of extensions) {
              _persistedExtensions.set(extension.id, extensionPoint);
            }

            return extensionPoint;
          } catch (error) {
            console.warn(`Error adding extension point: ${extensionPointId}`, {
              error,
            });
          }
        }
      )
    )
  );

  checkLifecycleInvariants();

  return added;
}

/**
 * Add the extensions to their respective extension points, and return the extension points with extensions.
 */
async function loadPersistedExtensionsOnce(): Promise<IExtensionPoint[]> {
  if (_initialLoad || _reloadOnNextNavigate) {
    _initialLoad = false;
    _reloadOnNextNavigate = false;
    // XXX: could also include _editorExtensions to handle case where user activates a mod while the page editor
    // is open. However, that would require handling corner case where the user reactivating a mod that has dirty
    // changes. It's not worth the complexity of handling the corner case.
    return logPromiseDuration(
      "loadPersistedExtensionsOnce:loadPersistedExtensions",
      loadPersistedExtensions()
    );
  }

  // NOTE: don't want _activeExtensionPoints, because we also want extension points that weren't active for the
  // previous page/navigation.
  return uniq([
    ..._persistedExtensions.values(),
    ..._editorExtensions.values(),
  ]);
}

/**
 * Wait for the page to be ready according to the site-specific navigation rules.
 */
async function waitDocumentLoad(abortSignal: AbortSignal): Promise<void> {
  const url = document.location.href;
  const rules = NAVIGATION_RULES.filter((rule) =>
    testMatchPatterns(rule.matchPatterns, url)
  );
  if (rules.length > 0) {
    const jointSelector = rules
      .flatMap((rule) => rule.loadingSelectors)
      .filter(Boolean) // Exclude empty selectors, if any
      .join(",");
    const poll = () => {
      if (abortSignal.aborted || $safeFind(jointSelector).length === 0) {
        return true;
      }

      console.debug(
        `Custom navigation rule detected that page is still loading: ${url}`
      );
    };

    await pollUntilTruthy(poll, {
      intervalMillis: WAIT_LOADED_INTERVAL_MS,
    });
  }
}

function decideRunReason({ force }: { force: boolean }): RunReason {
  if (force) {
    return RunReason.MANUAL;
  }

  if (_initialLoad) {
    return RunReason.INITIAL_LOAD;
  }

  return RunReason.NAVIGATE;
}

/**
 * Handle a website navigation, e.g., page load or a URL change in an SPA.
 */
export async function handleNavigate({
  force,
}: { force?: boolean } = {}): Promise<void> {
  const runReason = decideRunReason({ force });

  const thisTarget = await getThisFrame();
  if (thisTarget.frameId == null) {
    console.debug(
      "Ignoring handleNavigate because thisTarget.frameId is not set yet"
    );
    return;
  }

  const { href } = location;

  if (!force && _frameHref.get(thisTarget.frameId) === href) {
    console.debug("Ignoring NOOP navigation to %s", href, thisTarget);
    return;
  }

  _frameHref.set(thisTarget.frameId, href);

  console.debug("Handling navigation to %s", href, thisTarget);
  updateNavigationId();
  notifyNavigationListeners();

  const [extensionPoints] = await Promise.all([
    loadPersistedExtensionsOnce(),
    // Must always inject Page Script, so it's available to the Page Editor. Alternatively, we would inject it on
    // demand when the Page Editor loads.
    injectPageScriptOnce(),
  ]);

  const abortSignal = createNavigationAbortSignal();

  if (extensionPoints.length > 0) {
    // Wait for document to load, to ensure any selector-based availability rules are ready to be applied.
    await logPromiseDuration(
      "handleNavigate:waitDocumentLoad",
      waitDocumentLoad(abortSignal)
    );

    // Safe to use Promise.all because the inner method can't throw
    await logPromiseDuration(
      "handleNavigate:runExtensionPoints",
      Promise.all(
        extensionPoints.map(async (extensionPoint) => {
          // Don't await each extension point since the extension point may never appear. For example, an
          // extension point that runs on the contact information modal on LinkedIn
          const runPromise = runExtensionPoint(extensionPoint, {
            reason: runReason,
            abortSignal,
          }).catch((error) => {
            console.error("Error installing/running: %s", extensionPoint.id, {
              error,
            });
          });

          if (extensionPoint.syncInstall) {
            await runPromise;
          }
        })
      )
    );
  }
}

export async function queueReactivateTab() {
  console.debug("contentScript will reload extensions on next navigation");
  _reloadOnNextNavigate = true;
}

export async function reactivateTab() {
  await loadPersistedExtensions();
  // Force navigate event even though the href hasn't changed
  await handleNavigate({ force: true });
}
