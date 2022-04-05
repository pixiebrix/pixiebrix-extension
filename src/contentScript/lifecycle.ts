/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { ResolvedExtension, IExtensionPoint, RegistryId, UUID } from "@/core";
import * as context from "@/contentScript/context";
import * as sidebar from "@/contentScript/sidebar";
import { sleep } from "@/utils";
import { NAVIGATION_RULES } from "@/contrib/navigationRules";
import { testMatchPatterns } from "@/blocks/available";
import reportError from "@/telemetry/reportError";
import { groupBy } from "lodash";
import { resolveDefinitions } from "@/registry/internal";
import { traces } from "@/background/messenger/api";
import { isDeploymentActive } from "@/utils/deployment";
import { $safeFind } from "@/helpers";
import { PromiseCancelled } from "@/errors";

let _scriptPromise: Promise<void> | undefined;
const _dynamic: Map<UUID, IExtensionPoint> = new Map();
const _frameHref: Map<number, string> = new Map();
let _extensionPoints: IExtensionPoint[];
let _navSequence = 1;
const _installedExtensionPoints: IExtensionPoint[] = [];

// Reload extension definitions on next navigation
let _reloadOnNextNavigate = false;

const WAIT_LOADED_INTERVAL_MS = 25;

async function installScriptOnce(): Promise<void> {
  // https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script/9517879#9517879
  // https://stackoverflow.com/questions/9602022/chrome-extension-retrieving-global-variable-from-webpage
  if (_scriptPromise == null) {
    console.debug("Installing page script");
    _scriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = browser.runtime.getURL("pageScript.js");
      (document.head || document.documentElement).append(script);
      script.addEventListener("load", () => {
        script.remove();
        console.debug("Installed page script");
        resolve();
      });
    });
  }

  return _scriptPromise;
}

async function runExtensionPoint(
  extensionPoint: IExtensionPoint,
  isCancelled: () => boolean
): Promise<void> {
  let installed = false;

  try {
    installed = await extensionPoint.install();
  } catch (error) {
    if (error instanceof PromiseCancelled) {
      console.debug(
        `Skipping ${extensionPoint.id} because user navigated away from the page`
      );
      return;
    }

    throw error;
  }

  if (!installed) {
    console.debug(
      `Skipping ${extensionPoint.id} because it was not installed on the page`
    );
    return;
  }

  if (isCancelled()) {
    console.debug(
      `Skipping ${extensionPoint.id} because user navigated away from the page`
    );
    return;
  }

  console.debug(`Installed extension: ${extensionPoint.id}`);
  _installedExtensionPoints.push(extensionPoint);

  await extensionPoint.run();
}

export function getInstalledIds(): RegistryId[] {
  return _installedExtensionPoints.map((x) => x.id);
}

/**
 * Remove an extension from an extension point on the page
 */
export function removeExtension(
  extensionPointId: RegistryId,
  extensionId: UUID
) {
  const extensionPoint = _installedExtensionPoints.find((x) => x.id);
  if (extensionPoint) {
    extensionPoint.removeExtension(extensionId);
  } else {
    console.warn("Extension point %s not found", extensionPointId);
  }
}

function markUninstalled(id: RegistryId) {
  // Remove from _installedExtensionPoints so they'll be re-added on a call to loadExtensions
  const index = _installedExtensionPoints.findIndex((x) => x.id === id);
  if (index >= 0) {
    console.debug(`Extension point needs to be re-loaded: ${id}`);
    _installedExtensionPoints.splice(index, 1);
  }
}

/**
 * Remove a dynamic extension from the page.
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
export function clearDynamic(
  extensionId?: UUID,
  options?: { clearTrace?: boolean }
): void {
  const { clearTrace } = {
    clearTrace: true,
    ...options,
  };

  if (extensionId) {
    if (_dynamic.has(extensionId)) {
      console.debug(`clearDynamic: ${extensionId}`);
      const extensionPoint = _dynamic.get(extensionId);
      extensionPoint.uninstall({ global: true });
      _dynamic.delete(extensionId);
      sidebar.removeExtension(extensionId);
      markUninstalled(extensionPoint.id);
    } else {
      console.debug(`No dynamic extension exists for uuid: ${extensionId}`);
    }

    if (clearTrace) {
      traces.clear(extensionId);
    }
  } else {
    for (const extensionPoint of _dynamic.values()) {
      try {
        extensionPoint.uninstall({ global: true });
        sidebar.removeExtensionPoint(extensionPoint.id);
        markUninstalled(extensionPoint.id);
      } catch (error) {
        reportError(error);
      }
    }

    if (clearTrace) {
      traces.clearAll();
    }

    _dynamic.clear();
  }
}

function getNavSequence(): number {
  return _navSequence;
}

function makeCancelOnNavigate(): () => boolean {
  const currentNavSequence = _navSequence;
  return () => getNavSequence() > currentNavSequence;
}

export async function runDynamic(
  uuid: UUID,
  extensionPoint: IExtensionPoint
): Promise<void> {
  // Uninstall the previous extension point instance (in favor of the updated extensionPoint)
  if (_dynamic.has(uuid)) {
    _dynamic.get(uuid).uninstall();
  }

  _dynamic.set(uuid, extensionPoint);
  await runExtensionPoint(extensionPoint, makeCancelOnNavigate());
}

/**
 * Add extensions to their respective extension points.
 */
async function loadExtensions() {
  console.debug("Loading extensions for page");

  const previousIds = new Set<RegistryId>(
    (_extensionPoints ?? []).map((x) => x.id)
  );

  _extensionPoints = [];

  const options = await loadOptions();

  // Exclude disabled deployments first (because the organization admin might have disabled the deployment because it
  // was failing to install/load on the  page)
  const activeExtensions = options.extensions.filter((extension) =>
    isDeploymentActive(extension)
  );

  const resolvedExtensions = await Promise.all(
    activeExtensions.map(async (x) => resolveDefinitions(x))
  );

  const extensionMap = groupBy(resolvedExtensions, (x) => x.extensionPointId);

  await Promise.all(
    Object.entries(extensionMap).map(async (entry) => {
      // Object.entries loses the type information :sadface:
      const [extensionPointId, extensions] = entry as unknown as [
        RegistryId,
        ResolvedExtension[]
      ];

      if (extensions.length === 0 && !previousIds.has(extensionPointId)) {
        // Ignore the case where we uninstalled the last extension, but the extension point was
        // not deleted from the state.
        //
        // But for updates (i.e., re-activation flow) we need to include to so that when we run
        // syncExtensions their elements are removed from the page
        return;
      }

      try {
        const extensionPoint = await extensionPointRegistry.lookup(
          extensionPointId
        );

        extensionPoint.syncExtensions(extensions);

        if (extensions.length > 0) {
          // We cleared _extensionPoints prior to the loop, so we can just push w/o checking if it's already in the array
          _extensionPoints.push(extensionPoint);
        }
      } catch (error) {
        console.warn(`Error adding extension point: ${extensionPointId}`, {
          error,
        });
      }
    })
  );
}

/**
 * Add the extensions to their respective extension points, and return the extension points with extensions.
 */
async function loadExtensionsOnce(): Promise<IExtensionPoint[]> {
  if (_extensionPoints == null || _reloadOnNextNavigate) {
    _reloadOnNextNavigate = false;
    await loadExtensions();
  }

  return _extensionPoints;
}

/**
 * Wait for the page to be ready according to the site-specific navigation rules.
 */
async function waitLoaded(cancel: () => boolean): Promise<void> {
  const url = document.location.href;
  const rules = NAVIGATION_RULES.filter((rule) =>
    testMatchPatterns(rule.matchPatterns, url)
  );
  if (rules.length > 0) {
    const jointSelector = rules
      .flatMap((rule) => rule.loadingSelectors)
      .filter(Boolean) // Exclude empty selectors, if any
      .join(",");
    while ($safeFind(jointSelector).length > 0) {
      if (cancel()) {
        return;
      }

      console.debug(
        `Custom navigation rule detected that page is still loading: ${url}`
      );
      // eslint-disable-next-line no-await-in-loop -- looping to allow for sleep
      await sleep(WAIT_LOADED_INTERVAL_MS);
    }
  }
}

/**
 * Handle a website navigation, e.g., page load or a URL change in an SPA.
 */
export async function handleNavigate({
  force,
}: { force?: boolean } = {}): Promise<void> {
  if (context.frameId == null) {
    console.debug(
      "Ignoring handleNavigate because context.frameId is not set yet"
    );
    return;
  }

  const { href } = location;

  if (!force && _frameHref.get(context.frameId) === href) {
    console.debug(
      `Ignoring NOOP navigation to ${href} (tabId=${context.tabId}, frameId=${context.frameId})`
    );
    return;
  }

  _frameHref.set(context.frameId, href);

  console.debug(
    `Handling navigation to ${href} (tabId=${context.tabId}, frameId=${context.frameId})`
  );

  await installScriptOnce();

  context.updateNavigationId();

  const extensionPoints = await loadExtensionsOnce();

  if (extensionPoints.length > 0) {
    _navSequence++;

    const cancel = makeCancelOnNavigate();

    await waitLoaded(cancel);

    // Safe to use Promise.all since the inner method can't throw
    await Promise.all(
      extensionPoints.map(async (extensionPoint) => {
        // Don't await each extension point since the extension point may never appear. For example, an
        // extension point that runs on the contact information modal on LinkedIn
        const runPromise = runExtensionPoint(extensionPoint, cancel).catch(
          (error) => {
            console.error(`Error installing/running: ${extensionPoint.id}`, {
              error,
            });
          }
        );

        if (extensionPoint.syncInstall) {
          await runPromise;
        }
      })
    );
  }
}

export async function queueReactivateTab() {
  console.debug("contentScript will reload extensions on next navigation");
  _reloadOnNextNavigate = true;
}

export async function reactivateTab() {
  await loadExtensions();
  // Force navigate event even though the href hasn't changed
  await handleNavigate({ force: true });
}
