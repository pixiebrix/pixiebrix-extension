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

const SIDEBAR_WIDTH_PX = 400;

type ExtensionRef = {
  extensionId: string;
  extensionPointId: string;
};

type ShowCallback = () => void;

let _showPanel = false;
const _panels: PanelEntry[] = [];
const _callbacks: ShowCallback[] = [];
let _nonce: string = null;

export function registerShowCallback(onShow: ShowCallback): void {
  _callbacks.push(onShow);
}

let _originalMarginRight: number;

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
  _originalMarginRight = Number.parseFloat($html.css("margin-right"));
}

function adjustDocumentStyle(): void {
  const $html = getHTMLElement();
  $html.css("margin-right", `${_originalMarginRight + SIDEBAR_WIDTH_PX}px`);
}

function restoreDocumentStyle(): void {
  const html = getHTMLElement();
  html.css("margin-right", _originalMarginRight);
}

export function showActionPanel(): string {
  adjustDocumentStyle();

  if ($("#pixiebrix-chrome-extension").length > 0) {
    console.warn("Action panel already in DOM");
    return;
  }

  const actionURL = browser.runtime.getURL("action.html");

  const $panelContainer = $(
    `<div id="pixiebrix-chrome-extension" style="height: 100%; margin: 0; padding: 0; border-radius: 0; width: ${SIDEBAR_WIDTH_PX}px; position: fixed; top: 0; right: 0; z-index: 2147483647; border: 1px solid lightgray; background-color: rgb(255, 255, 255); display: block;"></div>`
  );

  _nonce = uuidv4();

  const $frame = $(
    `<iframe src="${actionURL}?nonce=${_nonce}" style="height: 100%; width: ${SIDEBAR_WIDTH_PX}px" allowtransparency="false" frameborder="0" scrolling="no" id="pixiebrix-frame"></iframe>`
  );

  $panelContainer.append($frame);

  $("body").append($panelContainer);

  // run the extension points available on the page
  for (const callback of _callbacks) {
    try {
      callback();
    } catch (error) {
      reportError(error);
    }
  }

  return _nonce;
}

export function hideActionPanel(): void {
  restoreDocumentStyle();
  _nonce = null;
  $("#pixiebrix-chrome-extension").remove();
  _showPanel = false;
}

export function toggleActionPanel(): string {
  _showPanel = !_showPanel;
  if (_showPanel) {
    return showActionPanel();
  } else {
    hideActionPanel();
    return null;
  }
}

export function isActionPanelVisible(): boolean {
  return _showPanel;
}

export function getStore(): ActionPanelStore {
  return { panels: _panels };
}

function renderPanels() {
  if (_showPanel) {
    void browser.runtime.sendMessage({
      type: FORWARD_FRAME_NOTIFICATION,
      payload: {
        type: RENDER_PANELS_MESSAGE,
        payload: { panels: _panels },
      },
    });
  }
}

export function removeExtensionPoint(extensionPointId: string): void {
  const current = _panels.splice(0, _panels.length);
  _panels.push(
    ...current.filter((x) => x.extensionPointId !== extensionPointId)
  );
  renderPanels();
}

export function reservePanels(refs: ExtensionRef[]): void {
  if (refs.length > 0) {
    for (const { extensionId, extensionPointId } of refs) {
      const entry = _panels.find((x) => x.extensionId === extensionId);
      if (!entry) {
        _panels.push({
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
  const entry = _panels.find((x) => x.extensionId === extensionId);
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
  const entry = _panels.find((x) => x.extensionId === extensionId);
  if (entry) {
    entry.payload = payload;
  } else {
    _panels.push({ extensionId, extensionPointId, heading, payload });
  }
  renderPanels();
}

const isBrowser =
  typeof window !== "undefined" && typeof window.document !== "undefined";

if (isBrowser) {
  storeOriginalCSS();
}
