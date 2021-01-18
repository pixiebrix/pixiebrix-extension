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

import { browser, Runtime, WebNavigation } from "webextension-polyfill-ts";
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
import OnDOMContentLoadedDetailsType = WebNavigation.OnDOMContentLoadedDetailsType;
import { Availability } from "@/blocks/types";

interface HandlerEntry {
  handler: (
    tabId: number,
    port: Runtime.Port
  ) => (...args: unknown[]) => unknown | Promise<unknown>;
  options: HandlerOptions;
}

type PromiseHandler = [(value: unknown) => void, (value: unknown) => void];

let openCount = 0;

type TabId = number;
type Nonce = string;

const backgroundHandlers = new Map<string, HandlerEntry>();
const devtoolsHandlers = new Map<Nonce, PromiseHandler>();
const connections = new Map<TabId, Runtime.Port>();
const waiting = new Map<TabId, PromiseHandler>();

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

  if (devtoolsHandlers.has(nonce)) {
    console.debug(`Handling background response: ${type} (nonce: ${nonce}`);
    const [resolve, reject] = devtoolsHandlers.get(nonce);
    devtoolsHandlers.delete(nonce);
    if (isErrorResponse(payload)) {
      reject(deserializeError(payload.$$error));
    }
    return resolve(payload);
  } else {
    console.warn(`Unexpected nonce ${nonce}`);
  }
}

function deleteStaleConnections(port: Runtime.Port) {
  const tabIds = Array.from(connections.keys());
  for (const tabId of tabIds) {
    // Theoretically each port should only correspond to a single tab, but iterate overall just to be safe
    if (connections.get(tabId) === port) {
      connections.delete(tabId);
      if (waiting.has(tabId)) {
        cancelWaiting(tabId);
      }
    }
  }
}

function connectDevtools(port: Runtime.Port) {
  if (!isBackgroundPage()) {
    throw new Error(
      "connectDevtools can only be called from the background page"
    );
  } else if (allowBackgroundSender(port.sender) && port.name === PORT_NAME) {
    // sender.tab won't be available if we don't have permissions for it yet
    console.debug(
      `Adding devtools listeners for port ${port.name} for tab: ${port.sender.tab?.id}`
    );

    // add/cleanup listener
    openCount++;
    port.onMessage.addListener(backgroundListener);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(backgroundListener);
      deleteStaleConnections(port);
      openCount--;
      console.debug(
        `Devtools port disconnected for tab: ${port.sender?.tab}; # open ports: ${openCount})`
      );
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
      devtoolsHandlers.set(nonce, [resolve, reject]);
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

export const connect = liftBackground(
  "CONNECT",
  (tabId: number, port: Runtime.Port) => async () => {
    if (connections.has(tabId) && connections.get(tabId) !== port) {
      console.warn(`Devtools connection already exists for tab: ${tabId}`);
    }
    connections.set(tabId, port);
  }
);

async function checkPermissions(): Promise<boolean> {
  if (!isBackgroundPage()) {
    throw new Error(
      "checkPermissions can only be called from the background page"
    );
  }
  // can't use browser.permissions.contains for permissions because it doesn't seem to work with activeTab
  try {
    await browser.tabs.executeScript({
      code: "true;",
      runAt: "document_start",
    });
    return true;
  } catch (reason) {
    // no permissions
  }
  return false;
}

export const getTabInfo = liftBackground(
  "CURRENT_URL",
  (tabId: number) => async () => {
    const hasPermissions = await checkPermissions();
    const { url } = await browser.tabs.get(tabId);
    return {
      url,
      hasPermissions,
    };
  }
);

function resolveWaiting(tabId: number): void {
  if (waiting.has(tabId)) {
    const [resolve] = waiting.get(tabId);
    resolve(undefined);
    waiting.delete(tabId);
  }
}

function cancelWaiting(tabId: number): void {
  // destroy the old promise
  const [, reject] = waiting.get(tabId);
  reject(
    new Error(
      `Devtools port disconnected, or another devtools panel is waiting for the tab: ${tabId}`
    )
  );
  waiting.delete(tabId);
}

export const awaitPermissions = liftBackground(
  "AWAIT_PERMISSIONS",
  (tabId: number) => () => {
    return new Promise((resolve, reject) => {
      if (waiting.has(tabId)) {
        cancelWaiting(tabId);
      }
      console.debug(`Devtools awaiting access to tab: ${tabId}`);
      waiting.set(tabId, [resolve, reject]);
    });
  }
);

async function injectDevtoolsContentScript(
  tabId: number,
  file: string
): Promise<boolean> {
  if (!isBackgroundPage()) {
    throw new Error(
      "injectDevtoolsContentScript can only be called from the background page"
    );
  }

  if (!(await contentScriptProtocol.isInstalled(tabId))) {
    console.debug(`Injecting devtools contentScript for tab ${tabId}: ${file}`);
    // inject in the top-level frame
    await browser.tabs.executeScript(tabId, {
      file,
      allFrames: false,
      frameId: 0,
    });
    return true;
  } else {
    console.debug(`contentScript already installed`);
    return false;
  }
}

export const injectScript = liftBackground(
  "INJECT_SCRIPT",
  (tabId: number) => async ({ file }: { file: string }) => {
    console.debug("devtools:executeScript", { tabId });
    await injectDevtoolsContentScript(tabId, file);
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
    root = undefined,
  }: {
    framework?: Framework;
    mode: nativeSelectionProtocol.SelectMode;
    traverseUp?: number;
    root?: string;
  }) => {
    return await nativeSelectionProtocol.selectElement(tabId, {
      framework,
      mode,
      traverseUp,
      root,
    });
  }
);

export const dragButton = liftBackground(
  "DRAG_BUTTON",
  (tabId: number) => async ({ uuid }: { uuid: string }) => {
    return await nativeEditorProtocol.dragButton(tabId, { uuid });
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

export const clearDynamicElements = liftBackground(
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

export const getInstalledExtensionPointIds = liftBackground(
  "INSTALLED_EXTENSION_POINT_IDS",
  (tabId: number) => async () => {
    return await nativeEditorProtocol.getInstalledExtensionPointIds(tabId);
  }
);

export const checkAvailable = liftBackground(
  "CHECK_AVAILABLE",
  (tabId: number) => async (availability: Availability) => {
    return await nativeEditorProtocol.checkAvailable(tabId, availability);
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

// Listener to inject contentScript on tabs that user has granted temporary access to and that the devtools
// are open. If the user has granted permanent access, it will get picked up by dynamic content script permissions
// registerPolyfill
async function injectionListener({
  tabId,
}: OnDOMContentLoadedDetailsType): Promise<void> {
  if (connections.has(tabId)) {
    const hasPermissions = await checkPermissions();
    if (hasPermissions) {
      await injectDevtoolsContentScript(tabId, "contentScript.js");
    } else {
      console.debug(
        `Skipping injectDevtoolsContentScript because no activeTab permissions for tab: ${tabId}`
      );
    }

    // let the devtools know it's now available
    resolveWaiting(tabId);
  } else {
    console.debug(
      `Skipping injectDevtoolsContentScript because devtools aren't open for tab: ${tabId}`
    );
  }
}

if (isBackgroundPage()) {
  console.debug("Adding devtools connection listener");
  browser.runtime.onConnect.addListener(connectDevtools);
  browser.webNavigation.onDOMContentLoaded.addListener(injectionListener);
}
