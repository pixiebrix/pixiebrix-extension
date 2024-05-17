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
import * as contentScriptApi from "@/contentScript/messenger/strict/api";
import { isEmpty, throttle } from "lodash";
import { signalFromEvent } from "abort-utils";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import * as sidebarMv2 from "@/contentScript/sidebarDomControllerLite";
import { getSidebarElement } from "@/contentScript/sidebarDomControllerLite";
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
import { isMV3 } from "@/mv3/api";
import { focusCaptureDialog } from "@/contentScript/focusCaptureDialog";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import { showMySidePanel } from "@/background/messenger/strict/api";
import focusController from "@/utils/focusController";
import selectionController from "@/utils/selectionController";
import { getTopLevelFrame, messenger } from "webext-messenger";
import {
  getSidebarTargetForCurrentTab,
  isUserGestureRequiredError,
} from "@/utils/sidePanelUtils";
import pRetry from "p-retry";
import { hideNotification, showNotification } from "@/utils/notify";

const HIDE_SIDEBAR_EVENT_NAME = "pixiebrix:hideSidebar";

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
const isSidePanelOpenMv3 = memoizeUntilSettled(async () => {
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

export const isSidePanelOpen = isMV3()
  ? isSidePanelOpenMv3
  : sidebarMv2.isSidebarFrameVisible;

// - Only start one ping at a time
// - Limit to one request every second (if the user closes the sidebar that quickly, we likely see those errors anyway)
// - Throw custom error if the sidebar doesn't respond in time
const pingSidebar = memoizeUntilSettled(
  throttle(async () => {
    let notificationId: string;
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
                autoDismissTimeMs: 12_000,
              });
            }
          },
        },
      );
    } catch (error) {
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
  const sidebarInitiallyOpenPromise = isSidePanelOpenMv3();

  if (isLoadedInIframe()) {
    console.warn("showSidebarInTopFrame should not be called in an iframe");
  }

  // Defensively handle accidental calls from iframes
  if (isMV3() || isLoadedInIframe()) {
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
  } else if (!sidebarMv2.isSidebarFrameVisible()) {
    sidebarMv2.insertSidebarFrame();
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
 * Content script handler for hiding the MV2 sidebar in the top-level frame. Regular callers should call
 * hideSidebar instead, which handles calls from MV3 and iframes.
 *
 * Dispatches HIDE_SIDEBAR_EVENT_NAME event even if the sidebar is not currently visible.
 * @see HIDE_SIDEBAR_EVENT_NAME
 * @see hideSidebar
 */
export function hideMv2SidebarInTopFrame(): void {
  if (isMV3()) {
    console.warn("hideMv2SidebarInTopFrame should not be called in MV3");
  }

  reportEvent(Events.SIDEBAR_HIDE);
  sidebarMv2.removeSidebarFrame();
  window.dispatchEvent(new CustomEvent(HIDE_SIDEBAR_EVENT_NAME));
}

/**
 * Hide the sidebar. Works from any frame.
 */
export function hideSidebar(): void {
  if (isMV3() || isLoadedInIframe()) {
    sidebarInThisTab.close();
  } else {
    hideMv2SidebarInTopFrame();
  }
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
  activateOptions: ActivatePanelOptions = {},
): Promise<void> {
  await pingSidebar();

  if (!isEmpty(activateOptions)) {
    // The sidebarSlice handles the race condition with the panels loading by keeping track of the latest pending
    // activatePanel request.
    await sidebarInThisTab.activatePanel(getTimedSequence(), {
      ...activateOptions,
      force: activateOptions.force,
    });
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
 * Remove all panels associated with given extensionIds.
 * @param extensionIds the extension UUIDs to remove
 */
export function removeExtensions(extensionIds: UUID[]): void {
  expectContext("contentScript");

  console.debug("sidebarController:removeExtensions", { extensionIds });

  // Avoid unnecessary messaging. More importantly, renderPanelsIfVisible should not be called from iframes. Iframes
  // might call removeExtensions as part of cleanup
  if (extensionIds.length === 0) {
    return;
  }

  // `panels` is const, so replace the contents
  const current = panels.splice(0);
  panels.push(...current.filter((x) => !extensionIds.includes(x.extensionId)));
  void renderPanelsIfVisible();
}

/**
 * Remove all panels associated with the given extensionPointId.
 * @param extensionPointId the extension point id (internal or external)
 * @param preserveExtensionIds array of extension ids to keep in the panel. Used to avoid flickering if updating
 * the extensionPoint for a sidebar extension from the Page Editor
 */
export function removeExtensionPoint(
  extensionPointId: RegistryId,
  { preserveExtensionIds = [] }: { preserveExtensionIds?: UUID[] } = {},
): void {
  expectContext("contentScript");

  console.debug("sidebarController:removeExtensionPoint %s", extensionPointId, {
    preserveExtensionIds,
    panels: panels.filter((x) => x.extensionPointId === extensionPointId),
  });

  // `panels` is const, so replace the contents
  const current = panels.splice(0);
  panels.push(
    ...current.filter(
      (x) =>
        x.extensionPointId !== extensionPointId ||
        preserveExtensionIds.includes(x.extensionId),
    ),
  );

  void renderPanelsIfVisible();
}

/**
 * Create placeholder panels showing loading indicators
 */
export function reservePanels(refs: ModComponentRef[]): void {
  if (refs.length === 0) {
    return;
  }

  const current = new Set(panels.map((x) => x.extensionId));
  for (const { extensionId, extensionPointId, blueprintId } of refs) {
    if (!current.has(extensionId)) {
      const entry: PanelEntry = {
        type: "panel",
        extensionId,
        extensionPointId,
        blueprintId,
        heading: "",
        payload: null,
      };

      console.debug(
        "sidebarController:reservePanels: reserve panel %s for %s",
        extensionId,
        extensionPointId,
        blueprintId,
        { ...entry },
      );

      panels.push(entry);
    }
  }

  void renderPanelsIfVisible();
}

export function updateHeading(extensionId: UUID, heading: string): void {
  const entry = panels.find((x) => x.extensionId === extensionId);

  if (entry) {
    entry.heading = heading;
    console.debug(
      "updateHeading: update heading for panel %s for %s",
      extensionId,
      entry.extensionPointId,
      { ...entry },
    );
    void renderPanelsIfVisible();
  } else {
    console.warn(
      "updateHeading: No panel exists for extension %s",
      extensionId,
    );
  }
}

export function upsertPanel(
  { extensionId, extensionPointId, blueprintId }: ModComponentRef,
  heading: string,
  payload: PanelPayload,
): void {
  const entry = panels.find((panel) => panel.extensionId === extensionId);
  if (entry) {
    entry.payload = payload;
    entry.heading = heading;
    console.debug(
      "sidebarController:upsertPanel: update existing panel %s for %s",
      extensionId,
      extensionPointId,
      blueprintId,
      { ...entry },
    );
  } else {
    console.debug(
      "sidebarController:upsertPanel: add new panel %s for %s",
      extensionId,
      extensionPointId,
      blueprintId,
      {
        entry,
        extensionPointId,
        heading,
        payload,
      },
    );
    panels.push({
      type: "panel",
      extensionId,
      extensionPointId,
      blueprintId,
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
  if (isMV3()) {
    window.addEventListener(
      "resize",
      async () => {
        // TODO: Replace with official event when available
        // Official event requested in https://github.com/w3c/webextensions/issues/517
        if (!(await isSidePanelOpenMv3())) {
          controller.abort();
        }
      },
      { signal: controller.signal },
    );
  } else {
    window.addEventListener(
      HIDE_SIDEBAR_EVENT_NAME,
      () => {
        controller.abort();
      },
      {
        signal: controller.signal,
      },
    );
  }

  return controller.signal;
}

export function sidePanelOnClose(callback: () => void): void {
  const signal = sidePanelOnCloseSignal();
  signal.addEventListener("abort", callback, { once: true });
}

export function initSidebarFocusEvents(): void {
  if (!isMV3()) {
    // Add listeners to track keep track of focus with the MV2 sidebar. When the user interacts
    // with the MV2 sidebar, the sidebar gets set as the document.activeElement. Required for brick
    // functionality such as InsertAtCursorEffect
    sidebarShowEvents.add(() => {
      const sidebar = getSidebarElement();

      if (!sidebar) {
        // Should always exist because sidebarShowEvents is called on Sidebar App initialization
        return;
      }

      // Save focus on initial load, because the user may have `mouseenter`ed the sidebar before the React App
      // fired the sidebarShowEvent event. For example, if the user clicked the browserAction toolbar button and
      // immediately `mouseenter`ed the sidebar (because the top of the sidebar is very close to the top browserAction)
      if (document.activeElement !== sidebar) {
        focusController.save();
      }

      const closeSignal = sidePanelOnCloseSignal();

      // Can't detect clicks in the sidebar itself. So need to just watch for enter/leave the sidebar element
      sidebar.addEventListener(
        "mouseenter",
        () => {
          // If the user clicks into the sidebar and then leaves the sidebar, don't set the focus to the sidebar
          // when they re-enter the sidebar
          if (document.activeElement !== sidebar) {
            // FIXME: If the user closes the sidebar when these two items are stored,
            // both controllers will be stuck that way until some other .restore()/.clear() call resets it. It will need a "sidebar hide" listener to ensure it doesn't happen
            // https://github.com/pixiebrix/pixiebrix-extension/pull/7842#discussion_r1516015396
            focusController.save();
            selectionController.save();
          }
        },
        { passive: true, capture: true, signal: closeSignal },
      );

      sidebar.addEventListener(
        "mouseleave",
        () => {
          focusController.clear();
          selectionController.clear();
        },
        { passive: true, capture: true, signal: closeSignal },
      );
    });
  }
}
