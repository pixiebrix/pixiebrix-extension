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

import {
  HandlerOptions,
  isNotification,
  RemoteProcedureCallRequest,
  SerializableResponse,
  toErrorResponse,
} from "@/messaging/protocol";
import { browser, Runtime, WebNavigation } from "webextension-polyfill-ts";
import { allowBackgroundSender } from "@/background/protocol";
import {
  BackgroundEventType,
  HandlerEntry,
  MESSAGE_PREFIX,
  Meta,
  PORT_NAME,
  PromiseHandler,
  TabId,
} from "@/background/devtools/contract";
import { reportError } from "@/telemetry/logging";
import { isBackgroundPage } from "webext-detect-page";
import { v4 as uuidv4 } from "uuid";
import { callBackground } from "@/background/devtools/external";
import { testTabPermissions, injectContentScript } from "@/background/util";

let numOpenConnections = 0;

const backgroundHandlers = new Map<string, HandlerEntry>();
const connections = new Map<TabId, Runtime.Port>();
const permissionsListeners = new Map<TabId, PromiseHandler[]>();

/**
 * Listener that runs on the background page.
 */
function backgroundMessageListener(
  request: RemoteProcedureCallRequest<Meta>,
  port: Runtime.Port
) {
  const { type, payload, meta } = request;
  const { handler, options } = backgroundHandlers.get(type) ?? {};

  if (!allowBackgroundSender(port.sender)) {
    console.debug(
      `Ignoring devtools message to background page from unknown sender`,
      port.sender
    );
    return;
  } else if (handler) {
    const notification = isNotification(options);

    console.debug(`Handling devtools request ${type} (nonce: ${meta?.nonce})`);

    const handlerPromise = new Promise((resolve) => {
      resolve(handler(meta.tabId, port)(...payload));
    });

    let responded = false;

    if (notification) {
      handlerPromise.catch((reason) => {
        console.warn(
          `An error occurred when handling notification ${type} (nonce: ${meta?.nonce}): ${reason}`,
          reason
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
      (reason) => {
        if (!responded) {
          port.postMessage({
            type: `${type}_REJECTED`,
            meta: { nonce: meta?.nonce },
            payload: toErrorResponse(type, reason),
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
        } catch (err) {
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
export function liftBackground<R extends SerializableResponse>(
  type: string,
  method: (tabId: number, port: Runtime.Port) => () => R | Promise<R>,
  options?: HandlerOptions
): (port: Runtime.Port) => Promise<R>;
export function liftBackground<T, R extends SerializableResponse>(
  type: string,
  method: (tabId: number, port: Runtime.Port) => (a0: T) => R | Promise<R>,
  options?: HandlerOptions
): (port: Runtime.Port, a0: T) => Promise<R>;
export function liftBackground<R extends SerializableResponse>(
  type: string,
  method: (
    tabId: number,
    port: Runtime.Port
  ) => (...args: unknown[]) => R | Promise<R>,
  options?: HandlerOptions
): (port: Runtime.Port, ...args: unknown[]) => Promise<R> {
  const fullType = `${MESSAGE_PREFIX}${type}`;

  if (isBackgroundPage()) {
    if (backgroundHandlers.has(fullType)) {
      console.warn(`Handler already registered for ${fullType}`);
    } else {
      // console.debug(`Installed background page handler for ${type}`);
      backgroundHandlers.set(fullType, { handler: method, options });
    }
  }

  return async (port: Runtime.Port, ...args: unknown[]) => {
    if (isBackgroundPage()) {
      throw new Error(
        "This method should not be called from the background page"
      );
    } else if (!port) {
      throw new Error("Devtools port is required");
    }
    return (await callBackground(port, fullType, args, options)) as R;
  };
}

function deleteStaleConnections(port: Runtime.Port) {
  const tabIds = Array.from(connections.keys());
  for (const tabId of tabIds) {
    // Theoretically each port should only correspond to a single tab, but iterate overall just to be safe
    if (connections.get(tabId) === port) {
      connections.delete(tabId);
      if (permissionsListeners.has(tabId)) {
        const listeners = permissionsListeners.get(tabId);
        permissionsListeners.delete(tabId);
        for (const [, reject] of listeners) {
          try {
            reject(new Error(`Cleaning up state connection`));
          } catch (err) {
            reportError(err);
          }
        }
      }
    }
  }
}

function connectDevtools(port: Runtime.Port): void {
  if (!isBackgroundPage()) {
    throw new Error(
      "connectDevtools can only be called from the background page"
    );
  } else if (allowBackgroundSender(port.sender) && port.name === PORT_NAME) {
    // sender.tab won't be available if we don't have permissions for it yet
    console.debug(
      `Adding devtools listeners for port ${port.name} for tab: ${
        port.sender.tab?.id ?? "[[no permissions for tab]]"
      }`
    );

    // add/cleanup listener
    numOpenConnections++;
    port.onMessage.addListener(backgroundMessageListener);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(backgroundMessageListener);
      deleteStaleConnections(port);
      numOpenConnections--;
      console.debug(
        `Devtools port disconnected for tab: ${port.sender?.tab}; # open ports: ${numOpenConnections})`
      );
    });
  } else {
    console.debug(
      `Ignoring connection request from unknown sender/port ${port.sender.id}`
    );
  }
}

export function registerPort(tabId: TabId, port: Runtime.Port): void {
  // can't register the port in connectDevtools because we might know the tab at that point
  if (connections.has(tabId) && connections.get(tabId) !== port) {
    console.warn(`Devtools connection already exists for tab: ${tabId}`);
  }
  connections.set(tabId, port);
}

// Listener to inject contentScript on tabs that user has granted temporary access to and that the devtools
// are open. If the user has granted permanent access, the content script will be injected based on the
// dynamic content script permissions registerPolyfill
async function injectTemporaryAccess({
  tabId,
  frameId,
}: WebNavigation.OnDOMContentLoadedDetailsType): Promise<void> {
  if (frameId === 0 && connections.has(tabId)) {
    const hasPermissions = await testTabPermissions(tabId);
    if (hasPermissions) {
      await injectContentScript(tabId);
    } else {
      console.debug(
        `Skipping injectDevtoolsContentScript because no activeTab permissions for tab: ${tabId}`
      );
    }
  }
}

export function emitDevtools(
  type: BackgroundEventType,
  details: { tabId: TabId; frameId: number }
): void {
  if (details.frameId === 0 && connections.has(details.tabId)) {
    console.debug(`emitDevtools: ${type}`, details);
    const port = connections.get(details.tabId);
    port.postMessage({
      type,
      meta: { tabId: details.tabId, nonce: uuidv4() },
      payload: details,
    });
  }
}

if (isBackgroundPage()) {
  console.debug("Adding devtools connection listener");
  browser.runtime.onConnect.addListener(connectDevtools);

  browser.webNavigation.onHistoryStateUpdated.addListener((details) => {
    emitDevtools("HistoryStateUpdate", details);
  });

  browser.webNavigation.onDOMContentLoaded.addListener((details) => {
    injectTemporaryAccess(details);
    emitDevtools("DOMContentLoaded", details);
  });
}
