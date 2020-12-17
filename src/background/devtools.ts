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

import { browser, Runtime } from "webextension-polyfill-ts";
import { isBackgroundPage } from "webext-detect-page";
import {
  HandlerOptions,
  isErrorResponse,
  isNotification,
  RemoteProcedureCallRequest,
  SerializableResponse,
  toErrorResponse,
} from "@/messaging/protocol";
import { v4 as uuidv4 } from "uuid";
import { deserializeError } from "serialize-error";
import { allowBackgroundSender } from "@/background/protocol";
import * as contentScriptProtocol from "@/contentScript/devTools";
import * as nativeEditorProtocol from "@/nativeEditor";
import * as nativeSelectionProtocol from "@/nativeEditor/selector";
import { Framework, FrameworkMeta } from "@/messaging/constants";
import { ReaderTypeConfig } from "@/blocks/readers/factory";
import { PanelSelectionResult } from "@/nativeEditor/insertPanel";

interface HandlerEntry {
  handler: (
    tabId: number,
    port: Runtime.Port
  ) => (...args: unknown[]) => unknown | Promise<unknown>;
  options: HandlerOptions;
}

type PromiseHandler = [(value: unknown) => void, (value: unknown) => void];

let openCount = 0;
const backgroundHandlers: { [key: string]: HandlerEntry } = {};
const devtoolsHandlers: { [nonce: string]: PromiseHandler } = {};
const connections: { [tabId: string]: Runtime.Port } = {};

export const PORT_NAME = "devtools-page";
export const MESSAGE_PREFIX = "@@pixiebrix/devtools/";

interface Meta {
  nonce: string;
  tabId: number;
}

interface BackgroundResponse {
  type: string;
  meta: Meta;
  payload: unknown;
}

function backgroundListener(
  request: RemoteProcedureCallRequest<Meta>,
  port: Runtime.Port
) {
  const { type, payload, meta } = request;
  const { handler, options } = backgroundHandlers[type] ?? {};

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
        port.postMessage({
          type: `${type}_FULFILLED`,
          meta: { nonce: meta?.nonce },
          payload: value,
        });
      },
      (reason) => {
        port.postMessage({
          type: `${type}_REJECTED`,
          meta: { nonce: meta?.nonce },
          payload: toErrorResponse(type, reason),
        });
      }
    );
  } else {
    console.warn(`No handler defined for message ${type}`, { request });
  }
}

function devtoolsListener(response: BackgroundResponse) {
  const {
    type,
    meta: { nonce },
    payload,
  } = response;

  if (devtoolsHandlers[nonce]) {
    console.debug(`Handling background response: ${type} (nonce: ${nonce}`);
    const [resolve, reject] = devtoolsHandlers[nonce];
    delete devtoolsHandlers[nonce];
    if (isErrorResponse(payload)) {
      reject(deserializeError(payload.$$error));
    }
    return resolve(payload);
  } else {
    console.warn(`Unexpected nonce ${nonce}`);
  }
}

function connectDevtools(port: Runtime.Port) {
  if (!isBackgroundPage()) {
    throw new Error(
      "connectDevtools can only be called from the background page"
    );
  } else if (allowBackgroundSender(port.sender) && port.name === PORT_NAME) {
    console.debug(`Adding listeners for port ${port.name}`);
    // add/cleanup listener
    openCount++;
    port.onMessage.addListener(backgroundListener);

    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(backgroundListener);

      const tabIds = Object.keys(connections);
      for (const tabId of tabIds) {
        if (connections[tabId] === port) {
          delete connections[tabId];
          break;
        }
      }

      openCount--;
      if (openCount === 0) {
        console.debug("last devtools window window closed");
      }

      console.debug("devtools port disconnected");
    });
  } else {
    console.debug(
      `Ignoring connection request from unknown sender/port ${port.sender.id}`
    );
  }
}

export function callBackground(
  port: Runtime.Port,
  type: string,
  args: unknown[],
  options: HandlerOptions
): Promise<unknown> {
  const nonce = uuidv4();
  const message = {
    type,
    payload: args,
    meta: { nonce, tabId: browser.devtools.inspectedWindow.tabId },
  };

  if (!port.onMessage) {
    throw new Error(`Port ${port.name} has undefined onMessage`);
  }

  if (isNotification(options)) {
    port.postMessage(message);
    if (browser.runtime.lastError) {
      return Promise.reject(
        `Error sending devtools notification: ${browser.runtime.lastError.message}`
      );
    } else {
      return Promise.resolve();
    }
  } else {
    if (!port.onMessage.hasListener(devtoolsListener)) {
      port.onMessage.addListener(devtoolsListener);
    }
    return new Promise((resolve, reject) => {
      devtoolsHandlers[nonce] = [resolve, reject];
      port.postMessage(message);
      if (browser.runtime.lastError) {
        reject(
          `Error sending devtools message: ${browser.runtime.lastError.message}`
        );
      }
    });
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
    if (backgroundHandlers[fullType]) {
      console.warn(`Handler already registered for ${fullType}`);
    } else {
      // console.debug(`Installed background page handler for ${type}`);
      backgroundHandlers[fullType] = { handler: method, options };
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
    return (await callBackground(port, fullType, args, options)) as any;
  };
}

export const connect = liftBackground(
  "CONNECT",
  (tabId: number, port: Runtime.Port) => async () => {
    connections[tabId] = port;
  }
);

export const getTabInfo = liftBackground(
  "CURRENT_URL",
  (tabId: number) => async () => {
    // can't use browser.permissions.contains for permissions because it doesn't seem to work with activeTab
    let hasPermissions = false;
    try {
      await browser.tabs.executeScript({
        code: "true;",
        runAt: "document_start",
      });
      hasPermissions = true;
    } catch (reason) {
      // no permissions
    }
    const { url } = await browser.tabs.get(tabId);
    return {
      url,
      hasPermissions,
    };
  }
);

export const injectScript = liftBackground(
  "INJECT_SCRIPT",
  (tabId: number) => async ({ file }: { file: string }) => {
    if (!(await contentScriptProtocol.isInstalled(tabId))) {
      console.debug(
        `Injecting devtools contentScript for tab ${tabId}: ${file}`
      );
      await browser.tabs.executeScript(tabId, { file });
      return true;
    } else {
      console.debug(`contentScript already installed`);
      return false;
    }
  }
);

export const readSelectedElement = liftBackground(
  "READ_ELEMENT",
  (tabId: number) => async () => {
    return await contentScriptProtocol.readSelected(tabId);
  }
);

export const detectFrameworks: (
  port: Runtime.Port
) => Promise<FrameworkMeta[]> = liftBackground(
  "DETECT_FRAMEWORKS",
  (tabId: number) => async () => {
    return (await contentScriptProtocol.detectFrameworks(
      tabId
    )) as FrameworkMeta[];
  }
);

// export const findComponent = liftBackground(
//     "FIND_COMPONENT",
//     (tabId: number) => async ({
//         selector,
//         framework
//       }: {
//       selector: string
//       framework: Framework
//     }) => {
//       return await nativeSelectionProtocol.findComponent(tabId, { selector, framework });
//     }
// )

export const selectElement = liftBackground(
  "SELECT_ELEMENT",
  (tabId: number) => async ({
    mode = "element",
    framework,
    traverseUp = 0,
  }: {
    framework?: Framework;
    mode: nativeSelectionProtocol.SelectMode;
    traverseUp?: number;
  }) => {
    return await nativeSelectionProtocol.selectElement(tabId, {
      framework,
      mode,
      traverseUp,
    });
  }
);

export const insertButton = liftBackground(
  "INSERT_BUTTON",
  (tabId: number) => async () => {
    return await nativeEditorProtocol.insertButton(tabId);
  }
);

export const insertPanel: (
  port: Runtime.Port
) => Promise<PanelSelectionResult> = liftBackground(
  "INSERT_PANEL",
  (tabId: number) => async () => {
    return await nativeEditorProtocol.insertPanel(tabId);
  }
);

export const updateDynamicElement = liftBackground(
  "UPDATE_DYNAMIC_ELEMENT",
  (tabId: number) => async (
    element: nativeEditorProtocol.DynamicDefinition
  ) => {
    return await nativeEditorProtocol.updateDynamicElement(tabId, element);
  }
);

export const clear = liftBackground(
  "CLEAR_DYNAMIC",
  (tabId: number) => async ({ uuid }: { uuid?: string }) => {
    return await nativeEditorProtocol.clear(tabId, { uuid });
  }
);

export const toggleOverlay = liftBackground(
  "TOGGLE_ELEMENT",
  (tabId: number) => async ({
    uuid,
    on = true,
  }: {
    uuid: string;
    on: boolean;
  }) => {
    return await nativeEditorProtocol.toggleOverlay(tabId, {
      selector: `[data-uuid="${uuid}"]`,
      on,
    });
  }
);

export const toggleSelector = liftBackground(
  "TOGGLE_SELECTOR",
  (tabId: number) => async ({
    selector,
    on = true,
  }: {
    selector: string;
    on: boolean;
  }) => {
    return await nativeEditorProtocol.toggleOverlay(tabId, { selector, on });
  }
);

export const searchWindow: (
  port: Runtime.Port,
  query: string
) => Promise<{ results: unknown[] }> = liftBackground(
  "SEARCH_WINDOW",
  (tabId: number) => async (query: string) => {
    return await contentScriptProtocol.searchWindow(tabId, query);
  }
);

export const runReader = liftBackground(
  "RUN_READER",
  (tabId: number) => async ({
    config,
    rootSelector,
  }: {
    config: ReaderTypeConfig;
    rootSelector?: string;
  }) => {
    return await contentScriptProtocol.runReader(tabId, {
      config,
      rootSelector,
    });
  }
);

if (isBackgroundPage()) {
  console.debug("Adding devtools connection listener");
  browser.runtime.onConnect.addListener(connectDevtools);
}
