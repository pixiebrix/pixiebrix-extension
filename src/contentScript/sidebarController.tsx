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

import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { expectContext } from "@/utils/expectContext";
import sidebarInThisTab from "@/sidebar/messenger/api";
import { isEmpty, throttle } from "lodash";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import * as sidebarMv2 from "./sidebarDomControllerLite";
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
import * as sidePanel from "@/sidebar/sidePanel/messenger/api";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { getTimedSequence } from "@/types/helpers";
import { backgroundTarget, getMethod } from "webext-messenger";
import { isMV3 } from "@/mv3/api";

export const HIDE_SIDEBAR_EVENT_NAME = "pixiebrix:hideSidebar";

export const isSidePanelOpen = isMV3()
  ? sidePanel.isSidePanelOpen
  : sidebarMv2.isSidebarFrameVisible;
export const isSidePanelOpenSync = isMV3()
  ? sidePanel.isSidePanelOpenSync
  : sidebarMv2.isSidebarFrameVisible;

// - Only start one ping at a time
// - Limit to one request every second (if the user closes the sidebar that quickly, we likely see those errors anyway)
// - Throw custom error if the sidebar doesn't respond in time
const pingSidebar = memoizeUntilSettled(
  throttle(async () => {
    try {
      await sidebarInThisTab.pingSidebar();
    } catch (error) {
      // TODO: Use TimeoutError after https://github.com/sindresorhus/p-timeout/issues/41
      throw new Error("The sidebar did not respond in time", { cause: error });
    }
  }, 1000) as () => Promise<void>,
);

/**
 * Event listeners triggered when the sidebar shows and is ready to receive messages.
 */
export const sidebarShowEvents = new SimpleEventTarget<RunArgs>();

export function sidebarWasLoaded(): void {
  sidebarShowEvents.emit({ reason: RunReason.MANUAL });
}

// eslint-disable-next-line local-rules/persistBackgroundData -- Unused there
const panels: PanelEntry[] = [];

let modActivationPanelEntry: ModActivationPanelEntry | null = null;

/**
 * Attach the sidebar to the page if it's not already attached. Then re-renders all panels.
 */
export async function showSidebar(): Promise<void> {
  console.debug("sidebarController:showSidebar");
  reportEvent(Events.SIDEBAR_SHOW);
  if (isMV3()) {
    // TODO: Import from background/messenger/api.ts after the strictNullChecks migration, drop "SIDEBAR_PING" string
    await getMethod("SHOW_MY_SIDE_PANEL" as "SIDEBAR_PING", backgroundTarget)();
  } else if (!sidebarMv2.isSidebarFrameVisible()) {
    sidebarMv2.insertSidebarFrame();
  }

  try {
    await pingSidebar();
  } catch (error) {
    throw new Error("The sidebar did not respond in time", { cause: error });
  }
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
 * Hide the sidebar. Dispatches HIDE_SIDEBAR_EVENT_NAME event even if the sidebar is not currently visible.
 * @see HIDE_SIDEBAR_EVENT_NAME
 */
export function hideSidebar(): void {
  console.debug("sidebarController:hideSidebar", {
    isSidebarFrameVisible: sidebarMv2.isSidebarFrameVisible(),
  });

  reportEvent(Events.SIDEBAR_HIDE);
  sidebarMv2.removeSidebarFrame();
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

  if (sidebarMv2.isSidebarFrameVisible()) {
    hideSidebar();
  }

  await showSidebar();
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

export async function renderPanelsIfVisible(): Promise<void> {
  expectContext("contentScript");

  console.debug("sidebarController:renderPanelsIfVisible");

  if (await isSidePanelOpen()) {
    void sidebarInThisTab.renderPanels(getTimedSequence(), panels);
  } else {
    console.debug(
      "sidebarController:renderPanelsIfVisible: skipping renderPanels because the sidebar is not visible",
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

  // `panels` is const, so replace the contents
  const current = panels.splice(0, panels.length);
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
  const current = panels.splice(0, panels.length);
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

// TODO: It doesn't work when the dev tools are open on the side
// Official event requested in https://github.com/w3c/webextensions/issues/517
export function sidePanelClosureSignal(): AbortSignal {
  const controller = new AbortController();
  expectContext("contentScript");
  if (isMV3()) {
    window.addEventListener(
      "resize",
      () => {
        if (isSidePanelOpenSync() === false) {
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
