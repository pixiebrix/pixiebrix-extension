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

import reportError from "@/telemetry/reportError";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { expectContext } from "@/utils/expectContext";
import sidebarInThisTab from "@/sidebar/messenger/api";
import { isEmpty } from "lodash";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import {
  insertSidebarFrame,
  isSidebarFrameVisible,
  removeSidebarFrame,
} from "./sidebarDomControllerLite";
import { type Except } from "type-fest";
import { type RunArgs, RunReason } from "@/types/runtimeTypes";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type ModComponentRef } from "@/types/modComponentTypes";
import type {
  ActivatePanelOptions,
  ModActivationPanelEntry,
  FormPanelEntry,
  PanelEntry,
  PanelPayload,
  TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import { getTemporaryPanelSidebarEntries } from "@/bricks/transformers/temporaryInfo/temporaryPanelProtocol";
import { getFormPanelSidebarEntries } from "@/contentScript/ephemeralFormProtocol";
import { logPromiseDuration } from "@/utils/promiseUtils";
import { waitAnimationFrame } from "@/utils/domUtils";

export const HIDE_SIDEBAR_EVENT_NAME = "pixiebrix:hideSidebar";

/**
 * Sequence number for ensuring render requests are handled in order
 */
let renderSequenceNumber = 0;

/**
 * Event listeners triggered when the sidebar shows and is ready to receive messages.
 */
export const sidebarShowEvents = new SimpleEventTarget<RunArgs>();

// eslint-disable-next-line local-rules/persistBackgroundData -- Unused there
const panels: PanelEntry[] = [];

let modActivationPanelEntry: ModActivationPanelEntry | null = null;

/**
 * Attach the sidebar to the page if it's not already attached. Then re-renders all panels.
 * @param activateOptions options controlling the visible panel in the sidebar
 */
export async function showSidebar(
  activateOptions: ActivatePanelOptions = {},
): Promise<void> {
  console.debug("sidebarController:showSidebar", {
    isSidebarFrameVisible: isSidebarFrameVisible(),
  });

  reportEvent(Events.SIDEBAR_SHOW);
  const isAlreadyShowing = isSidebarFrameVisible();

  if (!isAlreadyShowing) {
    insertSidebarFrame();
  }

  try {
    await sidebarInThisTab.pingSidebar();
  } catch (error) {
    throw new Error("The sidebar did not respond in time", { cause: error });
  }

  if (!isAlreadyShowing || (activateOptions.refresh ?? true)) {
    // Run the sidebar extension points available on the page. If the sidebar is already in the page, running
    // all the callbacks ensures the content is up-to-date

    // Currently, this runs the listening SidebarExtensionPoint.run callbacks in not particular order. Also note that
    // we're not awaiting their resolution (because they may contain long-running bricks).
    if (!isSidebarFrameVisible()) {
      console.error(
        "Pre-condition failed: sidebar is not attached in the page for call to sidebarShowEvents.emit",
      );
    }

    console.debug("sidebarController:showSidebar emitting sidebarShowEvents", {
      isSidebarFrameVisible: isSidebarFrameVisible(),
    });

    sidebarShowEvents.emit({ reason: RunReason.MANUAL });
  }

  if (!isEmpty(activateOptions)) {
    const seqNum = renderSequenceNumber;
    renderSequenceNumber++;

    // The sidebarSlice handles the race condition with the panels loading by keeping track of the latest pending
    // activatePanel request.
    void sidebarInThisTab
      .activatePanel(seqNum, {
        ...activateOptions,
        // If the sidebar wasn't showing, force the behavior. (Otherwise, there's a race on the initial activation,
        // where depending on when the message is received, the sidebar might already be showing a panel)
        force: activateOptions.force || !isAlreadyShowing,
      })
      // eslint-disable-next-line promise/prefer-await-to-then -- not in an async method
      .catch((error: unknown) => {
        reportError(
          new Error("Error activating sidebar panel", { cause: error }),
        );
      });
  }
}

/**
 * Force-show the panel for the given extension id
 * @param extensionId the extension UUID
 */
export async function activateExtensionPanel(extensionId: UUID): Promise<void> {
  expectContext("contentScript");

  if (!isSidebarFrameVisible()) {
    console.warn("sidebar is not attached to the page");
  }

  const seqNum = renderSequenceNumber;
  renderSequenceNumber++;

  void sidebarInThisTab.activatePanel(seqNum, {
    extensionId,
    force: true,
  });
}

/**
 * Awaitable version of showSidebar which does not reload existing panels if the sidebar is already visible
 * @see showSidebar
 */
export async function ensureSidebar(): Promise<void> {
  console.debug("sidebarController:ensureSidebar", {
    isSidebarFrameVisible: isSidebarFrameVisible(),
  });

  if (!isSidebarFrameVisible()) {
    expectContext("contentScript");
    await logPromiseDuration("ensureSidebar", showSidebar());
  }
}

/**
 * Hide the sidebar. Dispatches HIDE_SIDEBAR_EVENT_NAME event even if the sidebar is not currently visible.
 * @see HIDE_SIDEBAR_EVENT_NAME
 */
export function hideSidebar(): void {
  console.debug("sidebarController:hideSidebar", {
    isSidebarFrameVisible: isSidebarFrameVisible(),
  });

  reportEvent(Events.SIDEBAR_HIDE);
  removeSidebarFrame();
  window.dispatchEvent(new CustomEvent(HIDE_SIDEBAR_EVENT_NAME));
}

/**
 * Reload the sidebar and its content.
 *
 * Known limitations:
 * - Does not reload ephemeral forms
 */
export async function reloadSidebar(): Promise<void> {
  console.debug("sidebarController:reloadSidebar");

  // Hide and reshow to force a full-refresh of the sidebar

  if (isSidebarFrameVisible()) {
    hideSidebar();
  }

  await showSidebar();
}

/**
 * Rehydrate the already visible sidebar.
 *
 * For use with background/browserAction.
 * - `browserAction` calls toggleSidebarFrame to immediately adds the sidebar iframe
 * - It injects the content script
 * - It calls this method via messenger to complete the sidebar initialization
 */
export async function rehydrateSidebar(): Promise<void> {
  // Ensure DOM state is ready for accurate call to isSidebarFrameVisible. Shouldn't strictly be necessary, but
  // giving it a try and shouldn't impact performance. The background page has limited ability to determine when it's
  // OK to call rehydrateSidebar via messenger. See background/browserAction.ts.
  await waitAnimationFrame();

  // To assist with debugging race conditions in sidebar initialization
  console.debug("sidebarController:rehydrateSidebar", {
    isSidebarFrameVisible: isSidebarFrameVisible(),
  });

  if (isSidebarFrameVisible()) {
    // `showSidebar` includes the logic to hydrate it
    // `refresh: true` is the default, but be explicit that the sidebarShowEvents must run.
    void showSidebar({ refresh: true });
  } else {
    // `hideSidebar` includes events to cleanup the sidebar
    hideSidebar();
  }
}

function renderPanelsIfVisible(): void {
  expectContext("contentScript");

  console.debug("sidebarController:renderPanelsIfVisible");

  if (isSidebarFrameVisible()) {
    const seqNum = renderSequenceNumber;
    renderSequenceNumber++;
    void sidebarInThisTab.renderPanels(seqNum, panels);
  } else {
    console.debug(
      "sidebarController:renderPanelsIfVisible: skipping renderPanels because the sidebar is not visible",
    );
  }
}

export function showSidebarForm(entry: Except<FormPanelEntry, "type">): void {
  expectContext("contentScript");

  if (!isSidebarFrameVisible()) {
    throw new Error("Cannot add sidebar form if the sidebar is not visible");
  }

  const seqNum = renderSequenceNumber;
  renderSequenceNumber++;
  void sidebarInThisTab.showForm(seqNum, { type: "form", ...entry });
}

export function hideSidebarForm(nonce: UUID): void {
  expectContext("contentScript");

  if (!isSidebarFrameVisible()) {
    // Already hidden
    return;
  }

  const seqNum = renderSequenceNumber;
  renderSequenceNumber++;
  void sidebarInThisTab.hideForm(seqNum, nonce);
}

export function showTemporarySidebarPanel(
  entry: Except<TemporaryPanelEntry, "type">,
): void {
  expectContext("contentScript");

  if (!isSidebarFrameVisible()) {
    throw new Error(
      "Cannot add temporary sidebar panel if the sidebar is not visible",
    );
  }

  const sequence = renderSequenceNumber++;
  void sidebarInThisTab.showTemporaryPanel(sequence, {
    type: "temporaryPanel",
    ...entry,
  });
}

export function updateTemporarySidebarPanel(
  entry: Except<TemporaryPanelEntry, "type">,
): void {
  expectContext("contentScript");

  if (!isSidebarFrameVisible()) {
    throw new Error(
      "Cannot add temporary sidebar panel if the sidebar is not visible",
    );
  }

  const sequence = renderSequenceNumber++;
  sidebarInThisTab.updateTemporaryPanel(sequence, {
    type: "temporaryPanel",
    ...entry,
  });
}

export function hideTemporarySidebarPanel(nonce: UUID): void {
  expectContext("contentScript");

  if (!isSidebarFrameVisible()) {
    return;
  }

  const sequence = renderSequenceNumber++;
  void sidebarInThisTab.hideTemporaryPanel(sequence, nonce);
}

/**
 * Remove all panels associated with given extensionIds.
 * @param extensionIds the extension UUIDs to remove
 */
export function removeExtensions(extensionIds: UUID[]): void {
  expectContext("contentScript");

  console.debug("sidebarController:removeExtensions", { extensionIds });

  // `panels` is const, so replace the contents
  const current = panels.splice(0, panels.length);
  panels.push(...current.filter((x) => !extensionIds.includes(x.extensionId)));
  renderPanelsIfVisible();
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
  const current = panels.splice(0, panels.length);
  panels.push(
    ...current.filter(
      (x) =>
        x.extensionPointId !== extensionPointId ||
        preserveExtensionIds.includes(x.extensionId),
    ),
  );

  renderPanelsIfVisible();
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

  renderPanelsIfVisible();
}

export function updateHeading(extensionId: UUID, heading: string): void {
  const entry = panels.find((x) => x.extensionId === extensionId);

  console.debug("sidebarController:updateHeading %s", extensionId, {
    heading,
    panel: entry,
  });

  if (entry) {
    entry.heading = heading;
    console.debug(
      "updateHeading: update heading for panel %s for %s",
      extensionId,
      entry.extensionPointId,
      { ...entry },
    );
    renderPanelsIfVisible();
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

  renderPanelsIfVisible();
}

/**
 * Show a mod activation panel in the sidebar. If there's already a panel showing, it will be replaced.
 *
 * @param entry the mod activation panel entry
 * @throws Error if the sidebar frame is not visible
 */
export function showModActivationInSidebar(
  entry: Except<ModActivationPanelEntry, "type">,
): void {
  expectContext("contentScript");

  if (!isSidebarFrameVisible()) {
    throw new Error(
      "Cannot activate mods in the sidebar if the sidebar is not visible",
    );
  }

  modActivationPanelEntry = {
    type: "activateMods",
    ...entry,
  };

  const sequence = renderSequenceNumber++;
  void sidebarInThisTab.showModActivationPanel(
    sequence,
    modActivationPanelEntry,
  );
}

/**
 * Hide the mod activation panel in the sidebar.
 * @see showModActivationInSidebar
 */
export function hideModActivationInSidebar(): void {
  expectContext("contentScript");

  // Clear out in in-memory tracking
  modActivationPanelEntry = null;

  if (!isSidebarFrameVisible()) {
    return;
  }

  const sequence = renderSequenceNumber++;
  void sidebarInThisTab.hideModActivationPanel(sequence);
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
