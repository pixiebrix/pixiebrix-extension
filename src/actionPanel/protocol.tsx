/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import browser from "webextension-polyfill";
import { isBrowserActionPanel } from "@/chrome";
import { HandlerMap } from "@/messaging/protocol";
import { reportError } from "@/telemetry/logging";
import { ActionPanelStore, PanelEntry } from "@/actionPanel/actionPanelTypes";
import { FormDefinition } from "@/blocks/transformers/modalForm/formTypes";
import { UUID } from "@/core";

export const MESSAGE_PREFIX = "@@pixiebrix/browserAction/";

export const RENDER_PANELS_MESSAGE = `${MESSAGE_PREFIX}RENDER_PANELS`;
export const SHOW_FORM_MESSAGE = `${MESSAGE_PREFIX}SHOW_FORM`;

let seqNumber = -1;

type RenderPanelsMessage = {
  type: typeof RENDER_PANELS_MESSAGE;
  meta: { $seq: number };
  payload: { panels: PanelEntry[] };
};

type ShowFormMessage = {
  type: typeof SHOW_FORM_MESSAGE;
  meta: { $seq: number };
  payload: { form: FormDefinition; nonce: UUID };
};

export type StoreListener = {
  onRenderPanels: (store: Pick<ActionPanelStore, "panels">) => void;
  onShowForm: (form: { form: FormDefinition; nonce: UUID }) => void;
};

const listeners: StoreListener[] = [];

export function addListener(fn: StoreListener): void {
  if (listeners.includes(fn)) {
    console.warn("Listener already registered for action panel");
  } else {
    listeners.push(fn);
  }
}

export function removeListener(fn: StoreListener): void {
  listeners.splice(0, listeners.length, ...listeners.filter((x) => x !== fn));
}

const handlers = new HandlerMap();

handlers.set(RENDER_PANELS_MESSAGE, async (message: RenderPanelsMessage) => {
  const messageSeq = message.meta.$seq;

  if (messageSeq < seqNumber) {
    console.debug(
      "Skipping stale message (seq: %d, current: %d)",
      seqNumber,
      messageSeq,
      message
    );
    return;
  }

  seqNumber = messageSeq;

  console.debug(
    `Running ${listeners.length} listener(s) for %s`,
    RENDER_PANELS_MESSAGE,
    { message }
  );

  for (const listener of listeners) {
    try {
      listener.onRenderPanels(message.payload);
    } catch (error: unknown) {
      reportError(error);
    }
  }
});

handlers.set(SHOW_FORM_MESSAGE, async (message: ShowFormMessage) => {
  const messageSeq = message.meta.$seq;

  if (messageSeq < seqNumber) {
    console.debug(
      "Skipping stale message (seq: %d, current: %d)",
      seqNumber,
      messageSeq,
      message
    );
    return;
  }

  seqNumber = messageSeq;

  console.debug(
    `Running ${listeners.length} listener(s) for %s`,
    SHOW_FORM_MESSAGE,
    { message }
  );

  for (const listener of listeners) {
    try {
      listener.onShowForm(message.payload);
    } catch (error: unknown) {
      reportError(error);
    }
  }
});

if (isBrowserActionPanel()) {
  browser.runtime.onMessage.addListener(handlers.asListener());
}
