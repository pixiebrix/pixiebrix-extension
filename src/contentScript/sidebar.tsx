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
import { ExtensionRef, UUID } from "@/core";
import type {
  SidebarEntries,
  FormEntry,
  PanelEntry,
  RendererError,
} from "@/sidebar/types";
import { RendererPayload } from "@/runtime/runtimeTypes";
import { hideForm, renderPanels, showForm } from "@/sidebar/messenger/api";
import { MAX_Z_INDEX, PANEL_FRAME_ID } from "@/common";
import pDefer from "p-defer";

const SIDEBAR_WIDTH_PX = 400;
const PANEL_CONTAINER_SELECTOR = "#" + PANEL_FRAME_ID;
export const PANEL_HIDING_EVENT = "pixiebrix:hideSidebar";
export const SIDEBAR_WIDTH_CSS_PROPERTY = "--pb-sidebar-margin-right";

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

function getHTMLElement(): JQuery {
  // Resolve html tag, which is more dominant than <body>
  if (document.documentElement) {
    return $(document.documentElement);
  }

  if (document.querySelector("html")) {
    return $(document.querySelector("html"));
  }

  const $html = $("html");
  if ($html.length > 0) {
    return $html;
  }

  throw new Error("HTML node not found");
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
      "data-nonce": nonce, // Don't use jQuery.data because we need the attribute
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
 * Add the sidebar to the page if it's not already on the page
 * @param callbacks callbacks to refresh the panels, leave blank to refresh all extension panels
 */
export function showSidebar(callbacks = extensionCallbacks): string {
  reportEvent("SidePanelShow");

  const container: HTMLElement = document.querySelector(
    PANEL_CONTAINER_SELECTOR
  );

  let nonce = container?.dataset?.nonce;

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

  // TODO: Drop `nonce` if not used by the caller
  return nonce;
}

/**
 * Awaitable version of showSidebar which does not reload existing panels if the sidebar is already visible
 * @see showSidebar
 */
export async function ensureSidebar(): Promise<void> {
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
  return Boolean(document.querySelector(PANEL_CONTAINER_SELECTOR));
}

export function getSidebarEntries(): SidebarEntries {
  // `forms` state is managed by the sidebar react component
  return { panels, forms: [] };
}

function renderPanelsIfVisible() {
  expectContext("contentScript");

  if (isSidebarVisible()) {
    const seqNum = renderSequenceNumber;
    renderSequenceNumber++;
    void renderPanels({ tabId: "this", page: "/sidebar.html" }, seqNum, panels);
  } else {
    console.debug("Skipping renderPanels because the sidebar is not visible");
  }
}

export function showSidebarForm(entry: FormEntry) {
  expectContext("contentScript");

  if (!isSidebarVisible()) {
    throw new Error("Cannot add sidebar form if the sidebar is not visible");
  }

  const seqNum = renderSequenceNumber;
  renderSequenceNumber++;
  void showForm({ tabId: "this", page: "/sidebar.html" }, seqNum, entry);
}

export function hideSidebarForm(nonce: UUID) {
  expectContext("contentScript");

  if (!isSidebarVisible()) {
    // Already hidden
    return;
  }

  const seqNum = renderSequenceNumber;
  renderSequenceNumber++;
  void hideForm({ tabId: "this", page: "/sidebar.html" }, seqNum, nonce);
}

export function removeExtension(extensionId: string): void {
  expectContext("contentScript");

  // `panels` is const, so replace the contents
  const current = panels.splice(0, panels.length);
  panels.push(...current.filter((x) => x.extensionId !== extensionId));
  renderPanelsIfVisible();
}

export function removeExtensionPoint(extensionPointId: string): void {
  expectContext("contentScript");

  // `panels` is const, so replace the contents
  const current = panels.splice(0, panels.length);
  panels.push(
    ...current.filter((x) => x.extensionPointId !== extensionPointId)
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
  for (const { extensionId, extensionPointId } of refs) {
    if (!current.has(extensionId)) {
      const entry: PanelEntry = {
        extensionId,
        extensionPointId,
        heading: null,
        payload: null,
      };

      console.debug(
        "reservePanels: reserve panel %s for %s",
        extensionId,
        extensionPointId,
        { ...entry }
      );

      panels.push(entry);
    }
  }

  renderPanelsIfVisible();
}

export function updateHeading(extensionId: string, heading: string): void {
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
  { extensionId, extensionPointId }: ExtensionRef,
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
      { ...entry }
    );
  } else {
    console.debug(
      "upsertPanel: add new panel %s for %s",
      extensionId,
      extensionPointId,
      {
        entry,
        extensionPointId,
        heading,
        payload,
      }
    );
    panels.push({ extensionId, extensionPointId, heading, payload });
  }

  renderPanelsIfVisible();
}

if (IS_BROWSER) {
  storeOriginalCSS();
}
