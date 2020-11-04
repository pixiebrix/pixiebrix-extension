/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import {
  HandlerEntry,
  HandlerOptions,
  isErrorResponse,
  isNotification,
  RemoteProcedureCallRequest,
  SerializableResponse,
  toErrorResponse,
} from "@/messaging/protocol";
import { isBackgroundPage, isContentScript } from "webext-detect-page";
import { deserializeError } from "serialize-error";
import { browser, Runtime } from "webextension-polyfill-ts";

export const MESSAGE_PREFIX = "@@pixiebrix/contentScript/";

export class ContentScriptActionError extends Error {
  errors: unknown;

  constructor(message: string) {
    super(message);
    this.name = "ContentScriptActionError";
  }
}

const handlers: { [key: string]: HandlerEntry } = {};

export function allowSender(sender: Runtime.MessageSender): boolean {
  return sender.id === browser.runtime.id;
}

function contentScriptListener(
  request: RemoteProcedureCallRequest,
  sender: Runtime.MessageSender
): Promise<unknown> | undefined {
  const { type, payload } = request;
  const { handler, options } = handlers[type] ?? {};

  if (allowSender(sender) && handler) {
    console.debug(`Handling contentScript action ${type}`);

    const handlerPromise = new Promise((resolve) =>
      resolve(handler(...payload))
    );

    if (isNotification(options)) {
      return;
    } else {
      return handlerPromise.catch((reason) => {
        console.debug(`Handler returning error response for ${type}`);
        return toErrorResponse(type, reason);
      });
    }
  }
}

async function getTabIds(): Promise<number[]> {
  return (await browser.tabs.query({})).map((x) => x.id);
}

export function notifyContentScripts(
  type: string,
  method: () => void
): (tabId: number | null) => Promise<void>;
export function notifyContentScripts<T>(
  type: string,
  method: (a0: T) => void
): (tabId: number | null, a0: T) => Promise<void>;
export function notifyContentScripts<T0, T1>(
  type: string,
  method: (a0: T0, a1: T1) => void
): (tabId: number | null, a0: T0, a1: T1) => Promise<void>;
export function notifyContentScripts(
  type: string,
  method: (...args: unknown[]) => void
): (tabId: number | null, ...args: unknown[]) => Promise<void> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isContentScript()) {
    console.debug(`Installed content script handler for ${type}`);
    handlers[fullType] = {
      handler: method as any,
      options: { asyncResponse: false },
    };
  }

  return async (tabId: number | null, ...args: unknown[]) => {
    if (!isBackgroundPage()) {
      throw new ContentScriptActionError(
        "This method can only be called from the background page"
      );
    }
    console.debug(
      `Broadcasting content script notification ${fullType} to tab: ${
        tabId ?? "<all>"
      }`
    );
    const messageOne = (tabId: number) =>
      browser.tabs.sendMessage(tabId, { type: fullType, payload: args });
    const tabIds = tabId ? [tabId] : await getTabIds();
    Promise.all(tabIds.map(messageOne)).catch((reason) => {
      console.warn(
        `An error occurred when broadcasting content script notification ${fullType}`,
        reason
      );
    });
    return;
  };
}

/**
 * Lift a method to be run in the contentScript
 * @param type a unique name for the contentScript action
 * @param method the method to lift
 * @param options contentScript action handler options
 */
export function liftContentScript<R extends SerializableResponse>(
  type: string,
  method: () => R,
  options?: HandlerOptions
): (tabId: number) => Promise<R>;
export function liftContentScript<T, R extends SerializableResponse>(
  type: string,
  method: (a0: T) => R,
  options?: HandlerOptions
): (tabId: number, a0: T) => Promise<R>;
export function liftContentScript<T0, T1, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1) => R,
  options?: HandlerOptions
): (tabId: number, a0: T0, a1: T1) => Promise<R>;
export function liftContentScript<T0, T1, T2, R extends SerializableResponse>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2) => R,
  options?: HandlerOptions
): (tabId: number, a0: T0, a1: T1, a2: T2) => Promise<R>;
export function liftContentScript<
  T0,
  T1,
  T2,
  T3,
  R extends SerializableResponse
>(
  type: string,
  method: (a0: T0, a1: T1, a2: T2, a3: T3) => R,
  options?: HandlerOptions
): (tabId: number, a0: T0, a1: T1, a2: T2, a3: T3) => Promise<R>;
export function liftContentScript<R extends SerializableResponse>(
  type: string,
  method: (...args: unknown[]) => R,
  options?: HandlerOptions
): (tabId: number, ...args: unknown[]) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isContentScript()) {
    console.debug(`Installed content script handler for ${type}`);
    handlers[fullType] = { handler: method, options };
  }

  return async (tabId: number, ...args: unknown[]) => {
    if (isContentScript()) {
      console.debug("Resolving call from the contentScript immediately");
      return method(...args);
    } else if (!isBackgroundPage()) {
      throw new ContentScriptActionError(
        "Unexpected call from origin other than the background page"
      );
    }

    console.debug(
      `Sending content script action ${fullType} to tab: ${tabId ?? "<all>"}`
    );

    let response;

    try {
      response = await browser.tabs.sendMessage(tabId, {
        type: fullType,
        payload: args,
      });
    } catch (err) {
      console.debug(`Error sending content script action ${type}`, {
        tabId,
        err,
      });

      if (isNotification(options)) {
        return;
      } else {
        throw err;
      }
    }

    if (isErrorResponse(response)) {
      throw deserializeError(response.$$error);
    }
    return response;
  };
}

if (isContentScript()) {
  browser.runtime.onMessage.addListener(contentScriptListener);
}
