/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { browser } from "webextension-polyfill-ts";
import { reportError } from "@/telemetry/logging";
import { v4 as uuidv4 } from "uuid";
import {
  ActionPanelStore,
  PanelEntry,
  RENDER_PANELS_MESSAGE,
  RendererError,
  RendererPayload,
} from "@/actionPanel/protocol";
import { FORWARD_FRAME_NOTIFICATION } from "@/background/browserAction";
import { isBrowser } from "@/helpers";

const SIDEBAR_WIDTH_PX = 400;
const PANEL_CONTAINER_ID = "pixiebrix-chrome-extension";
const PANEL_CONTAINER_SELECTOR = "#" + PANEL_CONTAINER_ID;

type ExtensionRef = {
  extensionId: string;
  extensionPointId: string;
};

type ShowCallback = () => void;

const panels: PanelEntry[] = [];
const extensionCallbacks: ShowCallback[] = [];
let originalMarginRight: number;

export function registerShowCallback(onShow: ShowCallback): void {
  extensionCallbacks.push(onShow);
}

function getHTMLElement(): JQuery<HTMLElement> {
  // resolve html tag, which is more dominant than <body>
  if (document.documentElement) {
    return $(document.documentElement);
  } else if (document.querySelector("html")) {
    return $(document.querySelector("html"));
  } else if ($("html").length > -1) {
    return $("html");
  } else {
    throw new Error("HTML node not found");
  }
}

function storeOriginalCSS() {
  const $html = getHTMLElement();
  originalMarginRight = Number.parseFloat($html.css("margin-right"));
}

function adjustDocumentStyle(): void {
  const $html = getHTMLElement();
  $html.css("margin-right", `${originalMarginRight + SIDEBAR_WIDTH_PX}px`);
}

function restoreDocumentStyle(): void {
  const $html = getHTMLElement();
  $html.css("margin-right", originalMarginRight);
}

function insertActionPanel(): string {
  const nonce = uuidv4();

  const actionURL = browser.runtime.getURL("action.html");

  const $panelContainer = $(
    `<div id="${PANEL_CONTAINER_ID}" data-nonce="${nonce}" style="height: 100%; margin: 0; padding: 0; border-radius: 0; width: ${SIDEBAR_WIDTH_PX}px; position: fixed; top: 0; right: 0; z-index: 2147483647; border: 1px solid lightgray; background-color: rgb(255, 255, 255); display: block;"></div>`
  );

  const $frame = $(
    `<iframe id="pixiebrix-frame" src="${actionURL}?nonce=${nonce}" style="height: 100%; width: ${SIDEBAR_WIDTH_PX}px" allowtransparency="false" frameborder="0" scrolling="no" ></iframe>`
  );

  $panelContainer.append($frame);

  $("body").append($panelContainer);

  return nonce;
}

export function showActionPanel(): string {
  adjustDocumentStyle();

  const container: HTMLElement = document.querySelector(
    PANEL_CONTAINER_SELECTOR
  );

  const nonce = container?.dataset?.nonce ?? insertActionPanel();

  // Run the extension points available on the page. If the action panel is already in the page, running
  // all the callbacks ensures the content is up to date
  for (const callback of extensionCallbacks) {
    try {
      void callback();
    } catch (error) {
      // The callbacks should each have their own error handling. But wrap in a try-catch to ensure running
      // the callbacks does not interfere prevent showing the sidebar
      reportError(error);
    }
  }

  return nonce;
}

export function hideActionPanel(): void {
  console.debug("Hide action panel");
  restoreDocumentStyle();
  $(PANEL_CONTAINER_SELECTOR).remove();
}

export function toggleActionPanel(): string | null {
  if (isActionPanelVisible()) {
    hideActionPanel();
    return null;
  } else {
    return showActionPanel();
  }
}

export function isActionPanelVisible(): boolean {
  return document.querySelector(PANEL_CONTAINER_SELECTOR) != null;
}

export function getStore(): ActionPanelStore {
  return { panels };
}

function renderPanels() {
  if (isActionPanelVisible()) {
    void browser.runtime.sendMessage({
      type: FORWARD_FRAME_NOTIFICATION,
      payload: {
        type: RENDER_PANELS_MESSAGE,
        payload: { panels },
      },
    });
  }
}

export function removeExtensionPoint(extensionPointId: string): void {
  const current = panels.splice(0, panels.length);
  panels.push(
    ...current.filter((x) => x.extensionPointId !== extensionPointId)
  );
  renderPanels();
}

export function reservePanels(refs: ExtensionRef[]): void {
  if (refs.length > 0) {
    for (const { extensionId, extensionPointId } of refs) {
      const entry = panels.find((x) => x.extensionId === extensionId);
      if (!entry) {
        panels.push({
          extensionId,
          extensionPointId,
          heading: null,
          payload: null,
        });
      }
    }
    renderPanels();
  }
}

export function updateHeading(extensionId: string, heading: string): void {
  const entry = panels.find((x) => x.extensionId === extensionId);
  if (entry) {
    entry.heading = heading;
    renderPanels();
  }
}

export function upsertPanel(
  { extensionId, extensionPointId }: ExtensionRef,
  heading: string,
  payload: RendererPayload | RendererError
): void {
  const entry = panels.find((x) => x.extensionId === extensionId);
  if (entry) {
    entry.payload = payload;
  } else {
    panels.push({ extensionId, extensionPointId, heading, payload });
  }
  renderPanels();
}

if (isBrowser) {
  storeOriginalCSS();
}
