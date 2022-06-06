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

import reportError from "@/telemetry/reportError";
import { uuidv4 } from "@/types/helpers";
import { IS_BROWSER } from "@/helpers";
import { reportEvent } from "@/telemetry/events";
import { expectContext } from "@/utils/expectContext";
import { ExtensionRef, RegistryId, UUID } from "@/core";
import type {
  SidebarEntries,
  FormEntry,
  PanelEntry,
  RendererError,
  ActivatePanelOptions,
} from "@/sidebar/types";
import { RendererPayload } from "@/runtime/runtimeTypes";
import {
  hideForm,
  renderPanels,
  showForm,
  activatePanel,
} from "@/sidebar/messenger/api";
import { MAX_Z_INDEX, PANEL_FRAME_ID } from "@/common";
import pDefer from "p-defer";
import { getHTMLElement } from "@/utils/domUtils";
import { isEmpty } from "lodash";

const SIDEBAR_WIDTH_PX = 400;
const PANEL_CONTAINER_SELECTOR = "#" + PANEL_FRAME_ID;
export const PANEL_HIDING_EVENT = "pixiebrix:hideSidebar";
export const SIDEBAR_WIDTH_CSS_PROPERTY = "--pb-sidebar-margin-right";

/**
 * Sequence number for ensuring render requests are handled in order
 */
let renderSequenceNumber = 0;

export type ShowCallback = () => void;

const panels: PanelEntry[] = [];
const extensionCallbacks: ShowCallback[] = [];
let originalMarginRight: number;

export function registerShowCallback(onShow: ShowCallback): void {
  extensionCallbacks.push(onShow);
}

export function removeShowCallback(onShow: ShowCallback): void {
  const index = extensionCallbacks.indexOf(onShow);
  if (index > -1) {
    extensionCallbacks.splice(index, 1);
  }
}

function storeOriginalCSS() {
  const $html = getHTMLElement();
  originalMarginRight = Number.parseFloat($html.css("margin-right"));
}

function adjustDocumentStyle(): void {
  const $html = getHTMLElement();
  $html.css(
    SIDEBAR_WIDTH_CSS_PROPERTY,
    `${originalMarginRight + SIDEBAR_WIDTH_PX}px`
  );
  $html.css("margin-right", `var(${SIDEBAR_WIDTH_CSS_PROPERTY})`);
}

function restoreDocumentStyle(): void {
  const $html = getHTMLElement();
  $html.css(SIDEBAR_WIDTH_CSS_PROPERTY, "");
  $html.css("margin-right", originalMarginRight);
}

function insertSidebar(): string {
  const nonce = uuidv4();
  const actionURL = browser.runtime.getURL("sidebar.html");

  $("<iframe>")
    .attr({
      id: PANEL_FRAME_ID,
      src: `${actionURL}?nonce=${nonce}`,
      "data-nonce": nonce, // Don't use jQuery.data because we need this as an HTML attribute to target with selector
    })
    .css({
      position: "fixed",
      top: 0,
      right: 0,
      zIndex: MAX_Z_INDEX,
      width: SIDEBAR_WIDTH_PX,
      height: "100%",
      border: 0,
      borderLeft: "1px solid lightgray",
      background: "#f2edf3",
    })
    .appendTo("body");

  return nonce;
}

/**
 * Attach the sidebar to the page if it's not already attached. Then re-renders all panels.
 * @param activateOptions options controlling the visible panel in the sidebar
 * @param callbacks callbacks to refresh the panels, leave blank to refresh all extension panels
 */
export function showSidebar(
  activateOptions: ActivatePanelOptions = {},
  callbacks = extensionCallbacks
): string {
  reportEvent("SidePanelShow");

  const container: HTMLElement = document.querySelector(
    PANEL_CONTAINER_SELECTOR
  );

  let nonce = container?.dataset?.nonce;

  const isShowing = Boolean(nonce);

  if (!nonce) {
    console.debug("SidePanel is not on the page, attaching side panel");
    adjustDocumentStyle();
    nonce = insertSidebar();
  }

  // Run the extension points available on the page. If the sidebar is already in the page, running
  // all the callbacks ensures the content is up-to-date
  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      // The callbacks should each have their own error handling. But wrap in a try-catch to ensure running
      // the callbacks does not interfere prevent showing the sidebar
      reportError(error);
    }
  }

  if (!isEmpty(activateOptions)) {
    const seqNum = renderSequenceNumber;
    renderSequenceNumber++;

    // The sidebarSlice handles the race condition with the panels loading by keeping track of the latest pending
    // activatePanel request.
    void activatePanel({ tabId: "this", page: "/sidebar.html" }, seqNum, {
      ...activateOptions,
      // If the sidebar wasn't showing, force the behavior. (Otherwise, there's a race on the initial activation, where
      // depending on when the message is received, the sidebar might already be showing a panel)
      force: activateOptions.force || !isShowing,
    })
      // eslint-disable-next-line promise/prefer-await-to-then -- not in an async method
      .catch((error: unknown) => {
        reportError(
          new Error("Error activating sidebar panel", { cause: error })
        );
      });
  }

  // TODO: Drop `nonce` if not used by the caller
  return nonce;
}

/**
 * Force-show the panel for the given extension id
 * @param extensionId the extension UUID
 */
export async function activateExtensionPanel(extensionId: UUID): Promise<void> {
  expectContext("contentScript");

  if (!isSidebarVisible()) {
    console.warn("sidebar is not attached to the page");
  }

  const seqNum = renderSequenceNumber;
  renderSequenceNumber++;

  void activatePanel({ tabId: "this", page: "/sidebar.html" }, seqNum, {
    extensionId,
    force: true,
  });
}

/**
 * Awaitable version of showSidebar which does not reload existing panels if the sidebar is already visible
 * @see showSidebar
 */
export async function ensureSidebar(): Promise<void> {
  expectContext("contentScript");

  const show = pDefer();

  if (!isSidebarVisible()) {
    registerShowCallback(show.resolve);
    try {
      showSidebar();
      await show.promise;
    } finally {
      removeShowCallback(show.resolve);
    }
  }
}

export function hideSidebar(): void {
  reportEvent("SidePanelHide");
  restoreDocumentStyle();
  $(PANEL_CONTAINER_SELECTOR).remove();

  window.dispatchEvent(new CustomEvent(PANEL_HIDING_EVENT));
}

export function toggleSidebar(): string | void {
  if (!isSidebarVisible()) {
    return showSidebar();
  }

  hideSidebar();
}

export function isSidebarVisible(): boolean {
  expectContext("contentScript");

  return Boolean(document.querySelector(PANEL_CONTAINER_SELECTOR));
}

/**
 * Return the Sidebar state for the React App to get the state from sidebar controller.
 *
 * Called from the Sidebar React App via the messenger API
 */
export function getSidebarEntries(): SidebarEntries {
  expectContext("contentScript");

  // `forms` state is managed by the sidebar react component
  return { panels, forms: [] };
}

function renderPanelsIfVisible(): void {
  expectContext("contentScript");

  if (isSidebarVisible()) {
    const seqNum = renderSequenceNumber;
    renderSequenceNumber++;
    void renderPanels({ tabId: "this", page: "/sidebar.html" }, seqNum, panels);
  } else {
    console.debug("Skipping renderPanels because the sidebar is not visible");
  }
}

export function showSidebarForm(entry: FormEntry): void {
  expectContext("contentScript");

  if (!isSidebarVisible()) {
    throw new Error("Cannot add sidebar form if the sidebar is not visible");
  }

  const seqNum = renderSequenceNumber;
  renderSequenceNumber++;
  void showForm({ tabId: "this", page: "/sidebar.html" }, seqNum, entry);
}

export function hideSidebarForm(nonce: UUID): void {
  expectContext("contentScript");

  if (!isSidebarVisible()) {
    // Already hidden
    return;
  }

  const seqNum = renderSequenceNumber;
  renderSequenceNumber++;
  void hideForm({ tabId: "this", page: "/sidebar.html" }, seqNum, nonce);
}

export function removeExtension(extensionId: UUID): void {
  expectContext("contentScript");

  // `panels` is const, so replace the contents
  const current = panels.splice(0, panels.length);
  panels.push(...current.filter((x) => x.extensionId !== extensionId));
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
  { preserveExtensionIds = [] }: { preserveExtensionIds?: UUID[] } = {}
): void {
  expectContext("contentScript");

  console.debug("removeExtensionPoint %s", extensionPointId, {
    preserveExtensionIds,
  });

  // `panels` is const, so replace the contents
  const current = panels.splice(0, panels.length);
  panels.push(
    ...current.filter(
      (x) =>
        x.extensionPointId !== extensionPointId ||
        preserveExtensionIds.includes(x.extensionId)
    )
  );
  renderPanelsIfVisible();
}

/**
 * Create placeholder panels showing loading indicators
 */
export function reservePanels(refs: ExtensionRef[]): void {
  if (refs.length === 0) {
    return;
  }

  const current = new Set(panels.map((x) => x.extensionId));
  for (const { extensionId, extensionPointId, blueprintId } of refs) {
    if (!current.has(extensionId)) {
      const entry: PanelEntry = {
        extensionId,
        extensionPointId,
        blueprintId,
        heading: null,
        payload: null,
      };

      console.debug(
        "reservePanels: reserve panel %s for %s",
        extensionId,
        extensionPointId,
        blueprintId,
        { ...entry }
      );

      panels.push(entry);
    }
  }

  renderPanelsIfVisible();
}

export function updateHeading(extensionId: UUID, heading: string): void {
  const entry = panels.find((x) => x.extensionId === extensionId);
  if (entry) {
    entry.heading = heading;
    console.debug(
      "updateHeading: update heading for panel %s for %s",
      extensionId,
      entry.extensionPointId,
      { ...entry }
    );
    renderPanelsIfVisible();
  } else {
    console.warn(
      "updateHeading: No panel exists for extension %s",
      extensionId
    );
  }
}

export function upsertPanel(
  { extensionId, extensionPointId, blueprintId }: ExtensionRef,
  heading: string,
  payload: RendererPayload | RendererError
): void {
  const entry = panels.find((panel) => panel.extensionId === extensionId);
  if (entry) {
    entry.payload = payload;
    entry.heading = heading;
    console.debug(
      "upsertPanel: update existing panel %s for %s",
      extensionId,
      extensionPointId,
      blueprintId,
      { ...entry }
    );
  } else {
    console.debug(
      "upsertPanel: add new panel %s for %s",
      extensionId,
      extensionPointId,
      blueprintId,
      {
        entry,
        extensionPointId,
        heading,
        payload,
      }
    );
    panels.push({
      extensionId,
      extensionPointId,
      blueprintId,
      heading,
      payload,
    });
  }

  renderPanelsIfVisible();
}

if (IS_BROWSER) {
  storeOriginalCSS();
}
