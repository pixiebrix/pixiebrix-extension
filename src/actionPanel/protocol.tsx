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

import { browser, Runtime } from "webextension-polyfill-ts";
import { isBrowserActionPanel } from "@/chrome";

export const MESSAGE_PREFIX = "@@pixiebrix/browserAction/";

export const RENDER_PANELS_MESSAGE = `${MESSAGE_PREFIX}RENDER_PANELS`;

export function allowSender(sender: Runtime.MessageSender): boolean {
  return sender.id === browser.runtime.id;
}

/**
 * Information required to run a renderer
 */
export type RendererPayload = {
  blockId: string;
  key: string;
  args: unknown;
  ctxt: unknown;
};

export type RendererError = {
  key: string;
  error: string;
};

export type PanelEntry = {
  extensionId: string;
  extensionPointId: string;
  heading: string;
  payload: RendererPayload | RendererError | null;
};

type RenderPanelsMessage = {
  type: typeof RENDER_PANELS_MESSAGE;
  payload: { panels: PanelEntry[] };
};

export type ActionPanelStore = {
  panels: PanelEntry[];
};

type StoreListener = (store: ActionPanelStore) => void;

let _listeners: StoreListener[] = [];

export function addListener(fn: StoreListener): void {
  _listeners.push(fn);
}

export function removeListener(fn: StoreListener): void {
  _listeners = _listeners.filter((x) => x !== fn);
}

const handlers = new Map<string, typeof actionPanelListener>();

handlers.set(RENDER_PANELS_MESSAGE, async (request) => {
  const renderRequest = request as RenderPanelsMessage;
  console.debug(
    `Running render panels listeners for ${_listeners.length} listeners`
  );
  for (const listener of _listeners) {
    listener(renderRequest.payload);
  }
});

function actionPanelListener(
  request: RenderPanelsMessage,
  sender: Runtime.MessageSender
): Promise<unknown> | void {
  if (!allowSender(sender)) {
    return;
  }

  const handler = handlers.get(request.type);
  if (handler) {
    return handler(request, sender);
  }
}

if (isBrowserActionPanel()) {
  browser.runtime.onMessage.addListener(actionPanelListener);
}
