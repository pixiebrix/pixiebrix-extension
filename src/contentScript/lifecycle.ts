/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { getModComponentState } from "@/store/modComponents/modComponentStorage";
import starterBrickRegistry from "@/starterBricks/registry";
import { updateNavigationId } from "@/contentScript/context";
import * as sidebar from "@/contentScript/sidebarController";
import { NAVIGATION_RULES } from "@/contrib/navigationRules";
import { testMatchPatterns } from "@/bricks/available";
import reportError from "@/telemetry/reportError";
import { compact, debounce, groupBy, intersection, uniq } from "lodash";
import oneEvent from "one-event";
import { hydrateModComponentInnerDefinitions } from "@/registry/hydrateInnerDefinitions";
import { traces } from "@/background/messenger/api";
import { isDeploymentActive } from "@/utils/deploymentUtils";
import { PromiseCancelled } from "@/errors/genericErrors";
import { getThisFrame } from "webext-messenger";
import {
  type StarterBrick,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { RunReason } from "@/types/runtimeTypes";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { type SidebarStarterBrickABC } from "@/starterBricks/sidebar/sidebarStarterBrick";
import {
  getReloadOnNextNavigate,
  setReloadOnNextNavigate,
} from "@/contentScript/ready";
import {
  allSettled,
  logPromiseDuration,
  pollUntilTruthy,
} from "@/utils/promiseUtils";
import { $safeFind } from "@/utils/domUtils";
import { onContextInvalidated } from "webext-events";
import { ContextMenuStarterBrickABC } from "@/starterBricks/contextMenu/contextMenuStarterBrick";
import { ReusableAbortController } from "abort-utils";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import { notifyNavigationComplete } from "@/contentScript/sidebarController";
import pDefer from "p-defer";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * True if handling the initial frame load.
 * @see loadActivatedModComponentsOnce
 */
let _initialFrameLoad = true;

/**
 * Promise to memoize loading starter bricks and mod components from storage
 * @see loadActivatedModComponentsOnce
 */
let pendingFrameLoadPromise: Promise<StarterBrick[]> | null;

/**
 * Map from activated mod component IDs to their starter bricks.
 *
 * Mutually exclusive with _draftModComponentStarterBrickMap.
 *
 * @see _draftModComponentStarterBrickMap
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- Unused there
const _activatedModComponentStarterBrickMap = new Map<UUID, StarterBrick>();

/**
 * Map from draft mod component IDs currently being edited in the Page Editor to their starter bricks.
 *
 * Mutually exclusive with _activatedModComponentStarterBrickMap.
 *
 * @see _activatedModComponentStarterBrickMap
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- Unused there
const _draftModComponentStarterBrickMap = new Map<UUID, StarterBrick>();

/**
 * Starter bricks running in the frame.
 *
 * NOTE: the meaning of "run" varies by starter brick. For example, running a button starter brick means adding the
 * button to the page, i.e., as opposed to when the button is clicked.
 *
 * @see runStarterBrick
 * @see StarterBrick.runModComponents
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- Unused there
const _runningStarterBricks = new Set<StarterBrick>();

/**
 * Used to ignore navigation events that don't change the URL.
 */
let lastUrl: string | undefined;

/**
 * Abort controller for navigation events for Single Page Applications (SPAs).
 */
const navigationListeners = new ReusableAbortController();

const WAIT_LOADED_INTERVAL_MS = 25;

/**
 * Install and run a starter brick and specified mod components.
 * @param starterBrick the starter to install and run
 * @param reason the reason code for the run
 * @param modComponentIds the mod components to run on the starter brick, or undefined to run all mod components
 * @param abortSignal abort signal to cancel the installation/run
 * @see StarterBrick.runModComponents
 */
async function runStarterBrick(
  starterBrick: StarterBrick,
  {
    reason,
    modComponentIds,
    abortSignal,
  }: { reason: RunReason; modComponentIds?: UUID[]; abortSignal: AbortSignal },
): Promise<void> {
  // Could potentially call _runningStarterBricks.delete here, but assume the starter brick is still available
  // until we know for sure that it's not

  if (!(await starterBrick.isAvailable())) {
    // `starterBrick.install` should short-circuit return false if it's not available. But be defensive.
    return;
  }

  let installed = false;

  // Details to make it easier to debug starer brick lifecycle
  const details = {
    starterBrickId: starterBrick.id,
    kind: starterBrick.kind,
    name: starterBrick.name,
    permissions: starterBrick.permissions,
    modComponentIds,
    reason,
  };

  try {
    installed = await starterBrick.install();
  } catch (error) {
    if (error instanceof PromiseCancelled) {
      console.debug(
        `Skipping ${starterBrick.kind} ${starterBrick.id} because user navigated away from the page`,
        details,
      );

      _runningStarterBricks.delete(starterBrick);
      return;
    }

    throw error;
  }

  if (!installed) {
    console.debug(
      `Skipping ${starterBrick.kind} ${starterBrick.id} because it was not installed on the page`,
      details,
    );

    _runningStarterBricks.delete(starterBrick);
    return;
  }

  if (abortSignal.aborted) {
    console.debug(
      `Skipping ${starterBrick.kind} ${starterBrick.id} because user navigated away from the page`,
      details,
    );

    _runningStarterBricks.delete(starterBrick);
    return;
  }

  console.debug(
    `Installed starter brick ${starterBrick.kind}: ${starterBrick.id}`,
    details,
  );

  await starterBrick.runModComponents({ reason, modComponentIds });
  _runningStarterBricks.add(starterBrick);

  console.debug(
    `Ran starter brick ${starterBrick.kind}: ${starterBrick.id}`,
    details,
  );
}

/**
 * Ensure all starter bricks are installed that have StarterBrick.syncInstall set to true.
 *
 * Currently, starter bricks with sync installation are:
 * - Sidebar Panel
 * - Context Menu
 *
 * Used to ensure all sidebar starter bricks have had a chance to reserve panels before showing the sidebar.
 *
 * @see StarterBrick.isSyncInstall
 */
export async function ensureStarterBricksInstalled(): Promise<void> {
  const starterBricks = await loadActivatedModComponentsOnce();
  const syncStarterBricks = starterBricks.filter((x) => x.isSyncInstall);
  // Log to help debug race conditions
  console.debug("lifecycle:ensureInstalled", {
    syncStarterBricks,
  });
  await allSettled(
    syncStarterBricks.map(async (x) => x.install()),
    { catch: "ignore" },
  );
}

/**
 * Warn if any lifecycle state assumptions are violated.
 */
function checkLifecycleInvariants(): void {
  const activatedIds = [..._activatedModComponentStarterBrickMap.keys()];
  const draftIds = [..._draftModComponentStarterBrickMap.keys()];

  if (intersection(activatedIds, draftIds).length > 0) {
    console.warn("Activated and draft ids are not mutually exclusive", {
      activatedIds,
      draftIds,
    });
  }
}

/**
 * Returns all the starter bricks currently running on the page. Includes both activated and draft mod components.
 *
 * NOTE: the meaning of "run" varies by starter brick. For example, running a button starter brick means adding the
 * button to the page, i.e., as opposed to when the button is clicked.
 */
export function getRunningStarterBricks(): StarterBrick[] {
  return [..._runningStarterBricks];
}

/**
 * Test helper to get internal activated mod component state
 * @knip used in tests, see lifecycle.test.ts
 */
export function TEST_getActivatedModComponentStarterBrickMap(): Map<
  UUID,
  StarterBrick
> {
  return _activatedModComponentStarterBrickMap;
}

/**
 * Test helper to get internal draft mod component state
 * @knip used in tests, see lifecycle.test.ts
 */
export function TEST_getDraftModComponentStarterBrickMap(): Map<
  UUID,
  StarterBrick
> {
  return _draftModComponentStarterBrickMap;
}

/**
 * Remove a mod component on the page if a activated mod component (i.e. in modComponentSlice).
 *
 * @see removeDraftModComponents
 */
export function removeActivatedModComponent(modComponentId: UUID): void {
  // Leaving the starter brick in _runningStarterBricks. Could consider removing if this was the last mod component
  const starterBrick =
    _activatedModComponentStarterBrickMap.get(modComponentId);
  starterBrick?.removeModComponent(modComponentId);
  _activatedModComponentStarterBrickMap.delete(modComponentId);
}

/**
 * Remove draft mod components(s) from the frame.
 *
 * NOTE: if the draft mod component was taking the place of a activated mod component, call `reloadFrame` or a similar
 * method for the mod component to be reloaded.
 *
 * NOTE: this works by removing all mod components attached to the starter brick. Call `reloadFrame` or a similar
 * method to re-install/run the activated mod components.
 *
 * @param modComponentId an optional draft mod component id, or undefined to remove all draft mod components
 * @param options options to control clear behavior
 * @see reloadFrameMods
 */
export function removeDraftModComponents(
  modComponentId?: UUID,
  options?: { clearTrace?: boolean; preserveSidebar?: boolean },
): void {
  const { clearTrace, preserveSidebar } = {
    clearTrace: true,
    preserveSidebar: false,
    ...options,
  };

  if (modComponentId) {
    if (_draftModComponentStarterBrickMap.has(modComponentId)) {
      console.debug(`lifecycle:clearDraftModComponent: ${modComponentId}`);
      const starterBrick =
        _draftModComponentStarterBrickMap.get(modComponentId);
      assertNotNullish(starterBrick, "starterBrick must be defined");

      if (
        starterBrick.kind === StarterBrickTypes.SIDEBAR_PANEL &&
        preserveSidebar
      ) {
        const sidebar = starterBrick as SidebarStarterBrickABC;
        sidebar.HACK_uninstallExceptModComponent(modComponentId);
      } else {
        starterBrick.uninstall({ global: true });
      }

      _runningStarterBricks.delete(starterBrick);
      _draftModComponentStarterBrickMap.delete(modComponentId);
      sidebar.removeModComponents([modComponentId]);
    } else {
      console.debug(
        `No draft mod component exists for uuid: ${modComponentId}`,
      );
    }

    if (clearTrace) {
      void traces.clear(modComponentId);
    }
  } else {
    for (const starterBrick of _draftModComponentStarterBrickMap.values()) {
      try {
        starterBrick.uninstall({ global: true });
        _runningStarterBricks.delete(starterBrick);
        sidebar.removeStarterBrick(starterBrick.id);
      } catch (error) {
        reportError(error);
      }
    }

    _draftModComponentStarterBrickMap.clear();

    if (clearTrace) {
      traces.clearAll();
    }
  }
}

/**
 * Notifies all the listeners that the user has navigated in a way that changed the URL.
 */
function notifyNavigationListeners(): void {
  navigationListeners.abortAndReset();
}

/**
 * Register and run a draft mod component from the Page Editor.
 */
export async function runDraftModComponent(
  modComponentId: UUID,
  starterBrick: StarterBrick,
): Promise<void> {
  // Uninstall the activated mod component instance in favor of the draft mod component
  if (_activatedModComponentStarterBrickMap.has(modComponentId)) {
    removeActivatedModComponent(modComponentId);
  }

  // Uninstall the previous starter brick instance in favor of the updated starter brick
  if (_draftModComponentStarterBrickMap.has(modComponentId)) {
    // Pass preserveSidebar to avoid flickering permanent sidebars
    removeDraftModComponents(modComponentId, {
      clearTrace: false,
      preserveSidebar: true,
    });
  }

  _draftModComponentStarterBrickMap.set(modComponentId, starterBrick);

  await runStarterBrick(starterBrick, {
    // The Page Editor is the only caller for runDynamic
    reason: RunReason.PAGE_EDITOR,
    modComponentIds: [modComponentId],
    abortSignal: navigationListeners.signal,
  });

  checkLifecycleInvariants();
}

/**
 * Uninstall any starter bricks for mods that are no longer active.
 *
 * When mods are updated in the background script (i.e. via the Deployment updater), we don't remove
 * starter bricks from the current tab in order to not interrupt the user's workflow. This function can be
 * used to do that clean up at a more appropriate time, e.g. upon navigation.
 */
function uninstallDeactivatedStarterBricks(
  activeModComponentMap: Record<RegistryId, HydratedModComponent[]>,
): void {
  for (const starterBrick of _runningStarterBricks) {
    const hasActiveModComponents = Object.hasOwn(
      activeModComponentMap,
      starterBrick.id,
    );

    if (hasActiveModComponents) {
      continue;
    }

    try {
      starterBrick.uninstall({ global: true });
      _runningStarterBricks.delete(starterBrick);
    } catch (error) {
      reportError(error);
    }
  }
}

/**
 * Add mod components to their respective starter bricks.
 *
 * Includes starter bricks that are not available on the page.
 *
 * NOTE: Excludes draft mod components that are already on the page via the Page Editor.
 */
async function loadActivatedModComponents(): Promise<StarterBrick[]> {
  console.debug("lifecycle:loadActivatedModComponents");
  const options = await logPromiseDuration(
    "loadActivatedModComponents:loadOptions",
    getModComponentState(),
  );

  // Exclude the following:
  // - disabled deployments: the organization admin might have disabled the deployment because via Admin Console
  // - draft mod components: these are already installed on the page via the Page Editor
  const modComponentsToActivate = options.activatedModComponents.filter(
    (modComponent) => {
      if (_draftModComponentStarterBrickMap.has(modComponent.id)) {
        const draftStarterBrick = _draftModComponentStarterBrickMap.get(
          modComponent.id,
        );
        // Include sidebar starter brick kind as those are replaced
        // by the sidebar itself, automatically replacing old panels keyed by mod component id
        return draftStarterBrick?.kind === StarterBrickTypes.SIDEBAR_PANEL;
      }

      // Exclude disabled deployments
      return isDeploymentActive(modComponent);
    },
  );

  const hydratedActiveModComponents = await logPromiseDuration(
    "loadActivatedModComponents:hydrateDefinitions",
    Promise.all(
      modComponentsToActivate.map(async (x) =>
        hydrateModComponentInnerDefinitions(x),
      ),
    ),
  );

  const activeModComponentMap = groupBy(
    hydratedActiveModComponents,
    (x) => x.extensionPointId,
  );

  uninstallDeactivatedStarterBricks(activeModComponentMap);

  _activatedModComponentStarterBrickMap.clear();

  const added = compact(
    await Promise.all(
      Object.entries(activeModComponentMap).map(
        async ([starterBrickId, modComponents]: [
          RegistryId,
          HydratedModComponent[],
        ]) => {
          try {
            const starterBrick =
              await starterBrickRegistry.lookup(starterBrickId);

            // It's tempting to call starterBrick.isAvailable here and skip if it's not available.
            // However, that would cause the starter brick to be unavailable for the entire frame session
            // even if the SPA redirects to a page that matches.

            starterBrick.synchronizeModComponents(modComponents);

            // Mark the mod components as registered
            for (const modComponent of modComponents) {
              _activatedModComponentStarterBrickMap.set(
                modComponent.id,
                starterBrick,
              );
            }

            return starterBrick;
          } catch (error) {
            console.warn(`Error adding starter brick: ${starterBrickId}`, {
              error,
            });
          }
        },
      ),
    ),
  );

  checkLifecycleInvariants();

  return added;
}

/**
 * Add the mod components to their respective starter bricks. Returns the starter bricks with any mod components.
 *
 * Syncs the mod components, but does not call StarterBrick.install or StarterBrick.run.
 *
 * @see runStarterBrick
 */
async function loadActivatedModComponentsOnce(): Promise<StarterBrick[]> {
  // Enforce fresh view for _reloadOnNextNavigate
  if (_initialFrameLoad || getReloadOnNextNavigate()) {
    _initialFrameLoad = false;
    setReloadOnNextNavigate(false);
    // XXX: could also include _draftModComponentStarterBrickMap to handle case where user activates a mod while
    // the page editor is open. However, that would require handling corner case where the user reactivating a
    // mod that has dirty changes. It's not worth the complexity of handling the corner case.

    pendingFrameLoadPromise = logPromiseDuration(
      "loadActivatedModComponentsOnce:loadActivatedModComponents",
      loadActivatedModComponents(),
    );

    try {
      return await pendingFrameLoadPromise;
    } finally {
      // MemoizedUntilSettled behavior
      pendingFrameLoadPromise = null;
    }
  }

  if (pendingFrameLoadPromise != null) {
    return pendingFrameLoadPromise;
  }

  // NOTE: don't want _runningStarterBricks, because we also want starter bricks that weren't installed/running for the
  // previous frame navigation. (Because they may now be installed/running)
  return uniq([
    ..._activatedModComponentStarterBrickMap.values(),
    ..._draftModComponentStarterBrickMap.values(),
  ]);
}

/**
 * Wait for the page to be ready according to the site-specific navigation rules.
 */
async function waitDocumentLoad(abortSignal: AbortSignal): Promise<void> {
  const url = document.location.href;
  const rules = NAVIGATION_RULES.filter((rule) =>
    testMatchPatterns(rule.matchPatterns, url),
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
        `Custom navigation rule detected that page is still loading: ${url}`,
      );
    };

    await pollUntilTruthy(poll, {
      intervalMillis: WAIT_LOADED_INTERVAL_MS,
    });
  }
}

function decideRunReason({ force }: { force?: boolean }): RunReason {
  if (force) {
    return RunReason.MANUAL;
  }

  if (_initialFrameLoad) {
    return RunReason.INITIAL_LOAD;
  }

  return RunReason.NAVIGATE;
}

/**
 * Handle a website navigation, e.g., page load or a URL change in an SPA.
 * @knip export used in tests, see lifecycle.test.ts
 */
export async function handleNavigate({
  force,
}: { force?: boolean } = {}): Promise<void> {
  const runReason = decideRunReason({ force });
  const thisTarget = await getThisFrame();
  const { href } = location;
  if (!force && lastUrl === href) {
    console.debug(
      "handleNavigate:Ignoring NOOP navigation to %s",
      href,
      thisTarget,
    );
    return;
  }

  console.debug("handleNavigate:Handling navigation to %s", href, thisTarget);
  updateNavigationId();
  notifyNavigationListeners();

  const starterBricks = await loadActivatedModComponentsOnce();
  if (starterBricks.length > 0) {
    // Wait for document to load, to ensure any selector-based availability rules are ready to be applied.
    await logPromiseDuration(
      "handleNavigate:waitDocumentLoad",
      waitDocumentLoad(navigationListeners.signal),
    );

    // Safe to use Promise.all because the inner method can't throw
    await logPromiseDuration(
      "handleNavigate:runStarterBricks",
      Promise.all(
        starterBricks.map(async (starterBrick) => {
          // Don't await each starter brick because the starter brick may never appear. For example, an
          // starter brick that runs on the contact information modal on LinkedIn
          const runPromise = runStarterBrick(starterBrick, {
            reason: runReason,
            abortSignal: navigationListeners.signal,
          }).catch((error) => {
            console.error("Error installing/running: %s", starterBrick.id, {
              error,
            });
          });

          if (starterBrick.isSyncInstall) {
            await runPromise;
          }
        }),
      ),
    );
    // After all starter bricks have been installed, notify the sidebar that it is complete.
    if (!isLoadedInIframe()) {
      void notifyNavigationComplete();
    }
  }
}

/**
 * Mark that mods should be reloaded on next navigation, e.g., because a mod was updated/activated.
 */
export async function queueReloadFrameMods(): Promise<void> {
  console.debug("contentScript will reload mod components on next navigation");
  setReloadOnNextNavigate(true);
}

/**
 * Reload activated mods from storage, and re-install/run all mods on the current frame.
 */
export async function reloadFrameMods(): Promise<void> {
  await loadActivatedModComponents();
  // Force navigate event even though the href hasn't changed
  await handleNavigate({ force: true });
}

// Ideally we only want to catch local URL changes, but there's no way to discern
// navigation events that cause the current document to unload in the `navigate ` event.
async function onNavigate(event: NavigateEvent): Promise<void> {
  if (
    // Ignore navigations to external pages
    !event.destination.url.startsWith(location.origin) ||
    // Ignore <a download> links
    event.downloadRequest != null // Specifically `null` and not `''`
  ) {
    return;
  }

  try {
    await oneEvent(window, "beforeunload", {
      signal: AbortSignal.timeout(0),
    });
  } catch {
    // It timed out before the "beforeunload" event, so this is a same-document navigation
    await handleNavigate();
  }
}

// eslint-disable-next-line local-rules/persistBackgroundData -- not used in background script
const prerenderedTabActivated = pDefer<void>();

export async function activatePrerenderedTab(): Promise<void> {
  prerenderedTabActivated.resolve();
}

export async function initNavigation() {
  // If in prerendering mode, wait until the background notifies that the page is now active before running mods.
  // note: `prerendering` attribute only supported in Chromium-based browsers
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/prerendering
  if ("prerendering" in document && document.prerendering) {
    await prerenderedTabActivated.promise;
  }

  // Initiate PB for the current page
  await handleNavigate();

  // Listen to page URL changes
  // Some sites use the hash to encode page state (e.g., filters). There are some non-navigation scenarios
  // where the hash could change frequently (e.g., there is a timer in the state). Debounce to avoid overloading.
  window.navigation?.addEventListener(
    "navigate",
    debounce(onNavigate, 100, {
      leading: true,
      trailing: true,
      maxWait: 1000,
    }),
    { signal: onContextInvalidated.signal },
  );

  onContextInvalidated.addListener(() => {
    for (const [modComponentId, starterBrick] of [
      ..._activatedModComponentStarterBrickMap,
      ..._draftModComponentStarterBrickMap,
    ]) {
      // Exclude context menu mod components because they try to contact the (non-connectable) background page.
      // They're already removed by the browser anyway.
      if (!(starterBrick instanceof ContextMenuStarterBrickABC)) {
        starterBrick.removeModComponent(modComponentId);
      }
    }

    _activatedModComponentStarterBrickMap.clear();
    _draftModComponentStarterBrickMap.clear();
  });
}
