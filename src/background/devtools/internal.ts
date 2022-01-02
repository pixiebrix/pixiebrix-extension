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

import {
  HandlerOptions,
  isNotification,
  RemoteProcedureCallRequest,
  SerializableResponse,
  toErrorResponse,
} from "@/messaging/protocol";
import browser, { Runtime } from "webextension-polyfill";
import { allowBackgroundSender } from "@/background/protocol";
import {
  HandlerEntry,
  MESSAGE_PREFIX,
  PORT_NAME,
  PromiseHandler,
  TabId,
  Meta,
} from "@/background/devtools/contract";
import type { Target } from "@/types";
import { reportError } from "@/telemetry/logging";
import { isBackground } from "webext-detect-page";
import { callBackground } from "@/background/devtools/external";
import { reactivateEveryTab } from "@/background/messenger/api";
import { expectContext, forbidContext } from "@/utils/expectContext";
import { getErrorMessage, isPrivatePageError } from "@/errors";
import { clearDynamicElements } from "@/contentScript/messenger/api";

const TOP_LEVEL_FRAME_ID = 0;

let numOpenConnections = 0;

type Nonce = string;

const backgroundHandlers = new Map<Nonce, HandlerEntry>();
const connections = new Map<TabId, Runtime.Port>();
const permissionsListeners = new Map<TabId, PromiseHandler[]>();

/**
 * Listener that runs on the background page.
 */
function backgroundMessageListener(
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments -- It defaults to a different `Meta`
  request: RemoteProcedureCallRequest<Meta>,
  port: Runtime.Port
) {
  const { type, payload, meta } = request;
  const { handler, options } = backgroundHandlers.get(type) ?? {};

  if (!allowBackgroundSender(port.sender)) {
    console.debug(
      "Ignoring devtools message to background page from unknown sender",
      port.sender
    );
  } else if (handler) {
    const notification = isNotification(options);

    console.debug(`Handling devtools request ${type} (nonce: ${meta?.nonce})`);

    const handlerPromise = new Promise((resolve) => {
      resolve(
        handler(
          { tabId: meta.tabId, frameId: meta.frameId ?? 0 },
          port
        )(...payload)
      );
    });

    let responded = false;

    if (notification) {
      handlerPromise.catch((error) => {
        console.warn(
          `An error occurred when handling notification ${type} (nonce: ${meta?.nonce})`,
          error
        );
      });
      return;
    }

    handlerPromise.then(
      (value) => {
        if (!responded) {
          port.postMessage({
            type: `${type}_FULFILLED`,
            meta: { nonce: meta?.nonce },
            payload: value,
          });
        }

        responded = true;
      },
      (error) => {
        if (!responded) {
          port.postMessage({
            type: `${type}_REJECTED`,
            meta: { nonce: meta?.nonce },
            payload: toErrorResponse(type, error),
          });
        }

        responded = true;
      }
    );

    port.onDisconnect.addListener((port) => {
      if (!responded) {
        try {
          port.postMessage({
            type: `${type}_REJECTED`,
            meta: { nonce: meta?.nonce },
            payload: toErrorResponse(type, new Error("Port disconnected")),
          });
        } catch {
          console.debug(
            `Dropping message ${type}_REJECTED because port is disconnected`
          );
        }
      }

      responded = true;
    });
  } else {
    console.warn(`No handler defined for message ${type}`, { request });
  }
}

/**
 * Lift a method to be run on the background page
 * @param type a unique name for the background action
 * @param method the method to lift
 * @param options background action handler options
 */

export function liftBackground<
  TArguments extends unknown[],
  R extends SerializableResponse
>(
  type: string,
  method: (
    target: Target,
    port: Runtime.Port
  ) => (...args: TArguments) => Promise<R>,
  options?: HandlerOptions
): (port: Runtime.Port, ...args: TArguments) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isBackground()) {
    if (backgroundHandlers.has(fullType)) {
      console.warn(`Handler already registered for ${fullType}`);
    } else {
      backgroundHandlers.set(fullType, { handler: method, options });
    }
  }

  return async (port: Runtime.Port, ...args: unknown[]): Promise<R> => {
    forbidContext("background");

    if (!port) {
      throw new Error("Devtools port is required");
    }

    return callBackground(port, fullType, args, options) as Promise<R>;
  };
}

async function resetTab(tabId: number): Promise<void> {
  try {
    await clearDynamicElements({ tabId, frameId: TOP_LEVEL_FRAME_ID }, {});
  } catch (error) {
    console.warn("Error clearing dynamic elements for tab: %d", tabId, {
      error,
    });
    reportError(error);
  }

  console.info("Removed dynamic elements for tab: %d", tabId);

  // Re-activate the content script so any saved extensions are added to the page as "permanent" extensions
  reactivateEveryTab();

  console.info("Re-activated extensions for tab: %d", tabId);
}

function deleteStaleConnections(port: Runtime.Port) {
  // Theoretically each port should only correspond to a single tab, but iterate over all tabIds just to be safe
  for (const tabId of connections.keys()) {
    if (connections.get(tabId) === port) {
      connections.delete(tabId);

      void resetTab(tabId);

      if (permissionsListeners.has(tabId)) {
        const listeners = permissionsListeners.get(tabId);
        permissionsListeners.delete(tabId);
        for (const [, reject] of listeners) {
          reject(new Error("Cleaning up stale connection"));
        }
      }
    }
  }
}

function connectDevtools(port: Runtime.Port): void {
  expectContext("background");

  if (allowBackgroundSender(port.sender) && port.name === PORT_NAME) {
    // Sender.tab won't be available if we don't have permissions for it yet
    console.debug(
      `Adding devtools listeners for port ${port.name} for tab: ${
        port.sender.tab?.id ?? "[[no permissions for tab]]"
      }`
    );

    // `runtimeConnect` in chrome.ts expects a message after a successful connection
    port.postMessage({
      type: "DEVTOOLS_RUNTIME_CONNECTION_CONFIRMED",
    });

    // Add/cleanup listener
    numOpenConnections++;
    port.onMessage.addListener(backgroundMessageListener);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(backgroundMessageListener);
      deleteStaleConnections(port);
      numOpenConnections--;
      console.debug(
        `Devtools port disconnected for tab: ${port.sender?.tab.id}; # open ports: ${numOpenConnections})`
      );
    });
  } else {
    console.debug(
      `Ignoring connection request from unknown sender/port ${port.sender.id}`
    );
  }
}

export function registerPort(tabId: TabId, port: Runtime.Port): void {
  // Can't register the port in connectDevtools because we might know the tab at that point
  if (connections.has(tabId) && connections.get(tabId) !== port) {
    console.warn(`Devtools connection already exists for tab: ${tabId}`);
  }

  connections.set(tabId, port);
}

if (isBackground()) {
  console.debug("Adding devtools connection listener");
  browser.runtime.onConnect.addListener(connectDevtools);
}
