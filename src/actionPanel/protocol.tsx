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

import { reportError } from "@/telemetry/logging";
import { ActionPanelStore } from "@/actionPanel/actionPanelTypes";
import { FormDefinition } from "@/blocks/transformers/ephemeralForm/formTypes";
import { UUID } from "@/core";

export const MESSAGE_PREFIX = "@@pixiebrix/browserAction/";

export const RENDER_PANELS_MESSAGE = `${MESSAGE_PREFIX}RENDER_PANELS`;
export const SHOW_FORM_MESSAGE = `${MESSAGE_PREFIX}SHOW_FORM`;
export const HIDE_FORM_MESSAGE = `${MESSAGE_PREFIX}HIDE_FORM`;

let lastMessageSeen = -1;

export type StoreListener = {
  onRenderPanels: (store: Pick<ActionPanelStore, "panels">) => void;
  onShowForm: (form: { nonce: UUID; form: FormDefinition }) => void;
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

function handlerFactory<MethodName extends keyof StoreListener>(
  method: MethodName
): StoreListener[MethodName] {
  return async (message) => {
    const sequence = message.meta.$seq;

    if (sequence < lastMessageSeen) {
      console.debug(
        "Skipping stale message (seq: %d, current: %d)",
        lastMessageSeen,
        sequence,
        message
      );
      return;
    }

    lastMessageSeen = sequence;

    console.debug(`Running ${listeners.length} listener(s) for %s`, method, {
      message,
    });

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

export const renderPanels = handlerFactory("onRenderPanels");
export const showForm = handlerFactory("onShowForm");
export const hideForm = handlerFactory("onHideForm");
