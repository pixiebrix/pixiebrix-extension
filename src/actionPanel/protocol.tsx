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
import { HandlerMap, MessageHandler } from "@/messaging/protocol";
import { reportError } from "@/telemetry/logging";
import { ActionPanelStore } from "@/actionPanel/actionPanelTypes";
import { FormDefinition } from "@/blocks/transformers/ephemeralForm/formTypes";
import { ActionType, Message, Meta, UUID } from "@/core";

export const MESSAGE_PREFIX = "@@pixiebrix/browserAction/";

export const RENDER_PANELS_MESSAGE = `${MESSAGE_PREFIX}RENDER_PANELS`;
export const SHOW_FORM_MESSAGE = `${MESSAGE_PREFIX}SHOW_FORM`;
export const HIDE_FORM_MESSAGE = `${MESSAGE_PREFIX}HIDE_FORM`;

let seqNumber = -1;

/**
 * Redux message Meta with fields for ensuring message handling order
 */
interface SeqMeta extends Meta {
  $seq: number;
}

export type StoreListener = {
  onRenderPanels: (store: Pick<ActionPanelStore, "panels">) => void;
  onShowForm: (form: { form: FormDefinition; nonce: UUID }) => void;
  onHideForm: (form: { nonce: UUID }) => void;
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

function handlerFactory<
  TAction extends ActionType,
  M extends Message<string, SeqMeta>
>(
  messageType: M["type"],
  method: keyof StoreListener
): MessageHandler<TAction, SeqMeta> {
  return async (message) => {
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
      messageType,
      { message }
    );

    for (const listener of listeners) {
      try {
        // eslint-disable-next-line security/detect-object-injection -- method is keyof StoreListener
        listener[method](message.payload as any);
      } catch (error: unknown) {
        reportError(error);
      }
    }
  };
}

handlers.set(
  RENDER_PANELS_MESSAGE,
  handlerFactory(RENDER_PANELS_MESSAGE, "onRenderPanels")
);
handlers.set(
  SHOW_FORM_MESSAGE,
  handlerFactory(HIDE_FORM_MESSAGE, "onShowForm")
);
handlers.set(
  HIDE_FORM_MESSAGE,
  handlerFactory(HIDE_FORM_MESSAGE, "onHideForm")
);

if (isBrowserActionPanel()) {
  browser.runtime.onMessage.addListener(handlers.asListener());
}
