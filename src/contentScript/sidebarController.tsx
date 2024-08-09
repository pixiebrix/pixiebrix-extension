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

import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { expectContext } from "@/utils/expectContext";
import sidebarInThisTab from "@/sidebar/messenger/api";
import * as contentScriptApi from "@/contentScript/messenger/api";
import { isEmpty, throttle } from "lodash";
import { signalFromEvent } from "abort-utils";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import { type Except } from "type-fest";
import { type RunArgs, RunReason } from "@/types/runtimeTypes";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type ModComponentRef } from "@/types/modComponentTypes";
import type {
  ActivatePanelOptions,
  FormPanelEntry,
  ModActivationPanelEntry,
  PanelEntry,
  PanelPayload,
  TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import { getTemporaryPanelSidebarEntries } from "@/platform/panels/panelController";
import { getFormPanelSidebarEntries } from "@/platform/forms/formController";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { getTimedSequence } from "@/types/helpers";
import { focusCaptureDialog } from "@/contentScript/focusCaptureDialog";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import { showMySidePanel } from "@/background/messenger/api";
import { getTopLevelFrame, messenger } from "webext-messenger";
import {
  getSidebarTargetForCurrentTab,
  isUserGestureRequiredError,
} from "@/utils/sidePanelUtils";
import pRetry from "p-retry";
import { hideNotification, showNotification } from "@/utils/notify";

/**
 * Event listeners triggered when the sidebar shows and is ready to receive messages.
 */
export const sidebarShowEvents = new SimpleEventTarget<RunArgs>();

// eslint-disable-next-line local-rules/persistBackgroundData -- Unused there
const panels: PanelEntry[] = [];

let modActivationPanelEntry: ModActivationPanelEntry | null = null;

/*
 * Only one check at a time
 * Cannot throttle because subsequent checks need to be able to be made immediately
 */
export const isSidePanelOpen = memoizeUntilSettled(async () => {
  try {
    await messenger(
      "SIDEBAR_PING",
      { retry: false },
      await getSidebarTargetForCurrentTab(),
    );
    return true;
  } catch {
    return false;
  }
});

// - Only start one ping at a time
// - Limit to one request every second (if the user closes the sidebar that quickly, we likely see those errors anyway)
// - Throw custom error if the sidebar doesn't respond in time
const pingSidebar = memoizeUntilSettled(
  throttle(async () => {
    let notificationId = "";
    try {
      await pRetry(
        async () => {
          await sidebarInThisTab.pingSidebar();

          if (notificationId) {
            hideNotification(notificationId);
          }
        },
        {
          retries: 3,
          onFailedAttempt({ attemptNumber }) {
            if (attemptNumber === 1) {
              notificationId = showNotification({
                type: "info",
                message:
                  "The Sidebar is taking longer than expected to load. Retrying...",
                dismissable: false,
                // Should timeout and be removed long before this time
                autoDismissTimeMs: 30_000,
              });
            }
          },
        },
      );
    } catch (error) {
      // Hide the slow loading warning before showing the error
      hideNotification(notificationId);
      // TODO: Use TimeoutError after https://github.com/sindresorhus/p-timeout/issues/41
      throw new Error(
        "The Sidebar took too long to load. Retry your last action or reopen the Sidebar",
        { cause: error },
      );
    }
  }, 1000) as () => Promise<void>,
);

export function sidebarWasLoaded(): void {
  sidebarShowEvents.emit({ reason: RunReason.MANUAL });
}

/**
 * Content script handler for showing the sidebar in the top-level frame. Regular callers should call
 * showSidebar instead, which handles calls from iframes.
 *
 * - Resolves when the sidebar is initialized (responds to a ping)
 * - Shows focusCaptureDialog if a user gesture is required
 *
 * @see showSidebar
 * @see pingSidebar
 * @throws Error if the sidebar ping fails or does not respond in time
 */
// Don't memoizeUntilSettled this method. focusCaptureDialog is memoized which prevents this method from showing
// the focus dialog from multiple times. By allowing multiple concurrent calls to showSidebarInTopFrame,
// a subsequent call might succeed, which will then automatically close the focusCaptureDialog (via it's abort signal)
export async function showSidebarInTopFrame() {
  reportEvent(Events.SIDEBAR_SHOW);

  // We do not await the promise here since we want to show the sidebar as soon as possible to avoid the possibility
  // of the user needing to provide another user gesture to open the sidebar.
  const sidebarInitiallyOpenPromise = isSidePanelOpen();

  if (isLoadedInIframe()) {
    console.warn("showSidebarInTopFrame should not be called in an iframe");
  }

  try {
    await showMySidePanel();
  } catch (error) {
    if (!isUserGestureRequiredError(error)) {
      throw error;
    }

    await focusCaptureDialog({
      message: 'Click "Open Sidebar" to open the mod sidebar',
      buttonText: "Open Sidebar",
      signal: signalFromEvent(sidebarShowEvents, sidebarShowEvents.coreEvent),
    });
    await showMySidePanel();
  }

  await pingSidebar();

  // If the sidebar was already open, we need to trigger the sidebarShowEvent to rerun
  // the panel modComponents. This ensures that the "Show Sidebar brick" also refreshes the panel contents
  // if already open. Note that the sidebar itself already triggers this event when it's first opened, so
  // this check also ensures that we don't trigger the event twice in this situation.
  if (await sidebarInitiallyOpenPromise) {
    sidebarWasLoaded();
  }
}

/**
 * Attach the sidebar to the page if it's not already attached. Safe to call from any frame. Resolves when the
 * sidebar is initialized.
 * @see showSidebarInTopFrame
 */
export async function showSidebar(): Promise<void> {
  // Could consider explicitly calling showSidebarInTopFrame directly if we're already in the top frame.
  // But the messenger will already handle that case automatically.
  const topLevelFrame = await getTopLevelFrame();
  await contentScriptApi.showSidebar(topLevelFrame);
}

/**
 * Force-show the panel for the given extension id
 * @param extensionId the extension UUID
 */
export async function activateExtensionPanel(extensionId: UUID): Promise<void> {
  expectContext("contentScript");

  if (!(await isSidePanelOpen())) {
    console.warn("sidebar is not attached to the page");
  }

  void sidebarInThisTab.activatePanel(getTimedSequence(), {
    extensionId,
    force: true,
  });
}

/**
 * Hide the sidebar. Works from any frame.
 */
export function hideSidebar(): void {
  sidebarInThisTab.close();
}

/**
 * Toggle the sidebar opened/closed state. Can be called from any frame.
 */
export async function toggleSidebar(): Promise<void> {
  if (await isSidePanelOpen()) {
    hideSidebar();
  } else {
    await showSidebar();
  }
}

/**
 * @param activateOptions options controlling the visible panel in the sidebar
 */
export async function updateSidebar(
  activateOptions: ActivatePanelOptions,
): Promise<void> {
  await pingSidebar();

  if (!isEmpty(activateOptions)) {
    // The sidebarSlice handles the race condition with the panels loading by keeping track of the latest pending
    // activatePanel request.
    await sidebarInThisTab.activatePanel(getTimedSequence(), activateOptions);
  }
}

async function renderPanelsIfVisible(): Promise<void> {
  expectContext("contentScript");

  if (isLoadedInIframe()) {
    // The top-level frame is responsible for managing the panels for the sidebar.
    // Include this isLoadedInIframe check as a stop gap to prevent accidental calls from iframes.
    console.warn(
      "sidebarController:renderPanelsIfVisible should not be called from a frame",
    );
    return;
  }

  if (await isSidePanelOpen()) {
    void sidebarInThisTab.renderPanels(getTimedSequence(), panels);
  } else {
    console.debug(
      "sidebarController:renderPanelsIfVisible: skipping renderPanels because the sidebar is not visible",
    );
  }
}

export async function notifyNavigationComplete(): Promise<void> {
  expectContext("contentScript");

  if (isLoadedInIframe()) {
    // The top-level frame is responsible for managing the panels for the sidebar.
    // Include this isLoadedInIframe check as a stop gap to prevent accidental calls from iframes.
    console.warn(
      "sidebarController:notifyNavigationComplete should not be called from a frame",
    );
    return;
  }

  if (await isSidePanelOpen()) {
    void sidebarInThisTab.notifyNavigationComplete(getTimedSequence());
  } else {
    console.debug(
      "sidebarController:notifyNavigationComplete: skipping notifyNavigationComplete because the sidebar is not visible",
    );
  }
}

export async function showSidebarForm(
  entry: Except<FormPanelEntry, "type">,
): Promise<void> {
  expectContext("contentScript");

  if (!(await isSidePanelOpen())) {
    throw new Error("Cannot add sidebar form if the sidebar is not visible");
  }

  void sidebarInThisTab.showForm(getTimedSequence(), {
    type: "form",
    ...entry,
  });
}

export async function hideSidebarForm(nonce: UUID): Promise<void> {
  expectContext("contentScript");

  if (!(await isSidePanelOpen())) {
    // Already hidden
    return;
  }

  void sidebarInThisTab.hideForm(getTimedSequence(), nonce);
}

export async function showTemporarySidebarPanel(
  entry: Except<TemporaryPanelEntry, "type">,
): Promise<void> {
  expectContext("contentScript");

  if (!(await isSidePanelOpen())) {
    throw new Error(
      "Cannot add temporary sidebar panel if the sidebar is not visible",
    );
  }

  void sidebarInThisTab.showTemporaryPanel(getTimedSequence(), {
    type: "temporaryPanel",
    ...entry,
  });
}

export async function updateTemporarySidebarPanel(
  entry: Except<TemporaryPanelEntry, "type">,
): Promise<void> {
  expectContext("contentScript");

  if (!(await isSidePanelOpen())) {
    throw new Error(
      "Cannot add temporary sidebar panel if the sidebar is not visible",
    );
  }

  sidebarInThisTab.updateTemporaryPanel(getTimedSequence(), {
    type: "temporaryPanel",
    ...entry,
  });
}

export async function hideTemporarySidebarPanel(nonce: UUID): Promise<void> {
  expectContext("contentScript");

  if (!(await isSidePanelOpen())) {
    return;
  }

  void sidebarInThisTab.hideTemporaryPanel(getTimedSequence(), nonce);
}

/**
 * Remove all panels associated with given modComponentIds.
 * @param modComponentIds the mod component UUIDs to remove
 */
export function removeModComponents(modComponentIds: UUID[]): void {
  expectContext("contentScript");

  console.debug("sidebarController:removeExtensions", { modComponentIds });

  // Avoid unnecessary messaging. More importantly, renderPanelsIfVisible should not be called from iframes. Iframes
  // might call removeModComponents as part of cleanup
  if (modComponentIds.length === 0) {
    return;
  }

  // `panels` is const, so replace the contents
  const current = panels.splice(0);
  panels.push(
    ...current.filter(
      (x) => !modComponentIds.includes(x.modComponentRef.modComponentId),
    ),
  );
  void renderPanelsIfVisible();
}

/**
 * Remove all panels associated with the given extensionPointId.
 * @param starterBrickId the extension point id (internal or external)
 * @param preserveModComponentIds array of extension ids to keep in the panel. Used to avoid flickering if updating
 * the extensionPoint for a sidebar extension from the Page Editor
 */
export function removeStarterBrick(
  starterBrickId: RegistryId,
  { preserveModComponentIds = [] }: { preserveModComponentIds?: UUID[] } = {},
): void {
  expectContext("contentScript");

  console.debug("sidebarController:removeStarterBrick %s", starterBrickId, {
    preserveModComponentIds,
    panels: panels.filter(
      (x) => x.modComponentRef.starterBrickId === starterBrickId,
    ),
  });

  // `panels` is const, so replace the contents
  const current = panels.splice(0);
  panels.push(
    ...current.filter(
      (x) =>
        x.modComponentRef.starterBrickId !== starterBrickId ||
        preserveModComponentIds.includes(x.modComponentRef.modComponentId),
    ),
  );

  void renderPanelsIfVisible();
}

/**
 * Create placeholder panels showing loading indicators
 */
export function reservePanels(modComponentRefs: ModComponentRef[]): void {
  if (modComponentRefs.length === 0) {
    return;
  }

  const current = new Set(panels.map((x) => x.modComponentRef.modComponentId));
  for (const modComponentRef of modComponentRefs) {
    const { modComponentId, starterBrickId, modId } = modComponentRef;
    if (!current.has(modComponentId)) {
      const entry: PanelEntry = {
        type: "panel",
        modComponentRef,
        heading: "",
        payload: null,
      };

      console.debug(
        "sidebarController:reservePanels: reserve panel %s for %s",
        modComponentId,
        starterBrickId,
        modId,
        { ...entry },
      );

      panels.push(entry);
    }
  }

  void renderPanelsIfVisible();
}

export function updateHeading(modComponentId: UUID, heading: string): void {
  const entry = panels.find(
    (x) => x.modComponentRef.modComponentId === modComponentId,
  );

  if (entry) {
    entry.heading = heading;
    console.debug(
      "updateHeading: update heading for panel %s for %s",
      modComponentId,
      entry.modComponentRef.starterBrickId,
      { ...entry },
    );
    void renderPanelsIfVisible();
  } else {
    console.warn(
      "updateHeading: No panel exists for extension %s",
      modComponentId,
    );
  }
}

export function upsertPanel(
  modComponentRef: ModComponentRef,
  heading: string,
  payload: PanelPayload,
): void {
  const { modComponentId, starterBrickId, modId } = modComponentRef;

  const entry = panels.find(
    (panel) => panel.modComponentRef.modComponentId === modComponentId,
  );
  if (entry) {
    entry.payload = payload;
    entry.heading = heading;
    console.debug(
      "sidebarController:upsertPanel: update existing panel %s for %s",
      modComponentId,
      starterBrickId,
      modId,
      { ...entry },
    );
  } else {
    console.debug(
      "sidebarController:upsertPanel: add new panel %s for %s",
      modComponentId,
      starterBrickId,
      modId,
      {
        entry,
        starterBrickId,
        heading,
        payload,
      },
    );
    panels.push({
      type: "panel",
      modComponentRef,
      heading,
      payload,
    });
  }

  void renderPanelsIfVisible();
}

/**
 * Show a mod activation panel in the sidebar. If there's already a panel showing, it will be replaced.
 *
 * @param entry the mod activation panel entry
 * @throws Error if the sidebar frame is not visible
 */
export async function showModActivationInSidebar(
  entry: Except<ModActivationPanelEntry, "type">,
): Promise<void> {
  expectContext("contentScript");

  if (!(await isSidePanelOpen())) {
    throw new Error(
      "Cannot activate mods in the sidebar if the sidebar is not visible",
    );
  }

  modActivationPanelEntry = {
    type: "activateMods",
    ...entry,
  };

  void sidebarInThisTab.showModActivationPanel(
    getTimedSequence(),
    modActivationPanelEntry,
  );
}

/**
 * Hide the mod activation panel in the sidebar.
 * @see showModActivationInSidebar
 */
export async function hideModActivationInSidebar(): Promise<void> {
  expectContext("contentScript");

  // Clear out in in-memory tracking
  modActivationPanelEntry = null;

  if (!(await isSidePanelOpen())) {
    return;
  }

  void sidebarInThisTab.hideModActivationPanel(getTimedSequence());
}

/**
 * Return the panels that are "reserved", that will be shown when the sidebar is shown. The content may not be computed
 * yet. This includes:
 * - Permanent panels added by sidebarExtension
 * - Temporary panels added by DisplayTemporaryInfo
 * - Temporary form definitions added by ephemeralForm
 * - Activate Recipe panel added by sidebarActivation.ts activate button click-handlers
 */
export function getReservedPanelEntries(): {
  panels: PanelEntry[];
  temporaryPanels: TemporaryPanelEntry[];
  forms: FormPanelEntry[];
  modActivationPanel: ModActivationPanelEntry | null;
} {
  return {
    panels,
    temporaryPanels: getTemporaryPanelSidebarEntries(),
    forms: getFormPanelSidebarEntries(),
    modActivationPanel: modActivationPanelEntry,
  };
}

function sidePanelOnCloseSignal(): AbortSignal {
  const controller = new AbortController();
  expectContext("contentScript");
  window.addEventListener(
    "resize",
    async () => {
      // TODO: Replace with official event when available
      // Official event requested in https://github.com/w3c/webextensions/issues/517
      if (!(await isSidePanelOpen())) {
        controller.abort();
      }
    },
    { signal: controller.signal },
  );

  return controller.signal;
}

export function sidePanelOnClose(callback: () => void): void {
  const signal = sidePanelOnCloseSignal();
  signal.addEventListener("abort", callback, { once: true });
}
