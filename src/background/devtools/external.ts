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
  isErrorResponse,
  isNotification,
} from "@/messaging/protocol";
import { deserializeError } from "serialize-error";
import {
  BackgroundEvent,
  BackgroundResponse,
  Nonce,
  PromiseHandler,
  TabId,
} from "@/background/devtools/contract";
import { browser, Runtime, WebNavigation } from "webextension-polyfill-ts";
import { v4 as uuidv4 } from "uuid";
import { SimpleEvent } from "@/hooks/events";
import { forbidBackgroundPage } from "@/utils/expect-context";

const devtoolsHandlers = new Map<Nonce, PromiseHandler>();

type NavigationDetails = WebNavigation.OnHistoryStateUpdatedDetailsType &
  WebNavigation.OnDOMContentLoadedDetailsType;

export const navigationEvent = new SimpleEvent<NavigationDetails>();
export const contentScriptReady = new SimpleEvent<{
  tabId: TabId;
  frameId: number;
}>();

function devtoolsEventListener(event: BackgroundEvent) {
  console.debug(`devtools port message: ${event.type}`, event);
  if (
    event.type === "DOMContentLoaded" ||
    event.type === "HistoryStateUpdate"
  ) {
    navigationEvent.emit(event.payload.tabId, event.payload);
  } else if (event.type === "ContentScriptReady") {
    contentScriptReady.emit(event.payload.tabId, event.payload);
  }
}

function devtoolsMessageListener(response: BackgroundResponse) {
  const {
    type,
    meta: { nonce },
    payload,
  } = response;

  if (devtoolsHandlers.has(nonce)) {
    console.debug(
      `Handling response from background page: ${type} (nonce: ${nonce}`
    );
    const [resolve, reject] = devtoolsHandlers.get(nonce);
    devtoolsHandlers.delete(nonce);
    if (isErrorResponse(payload)) {
      reject(deserializeError(payload.$$error));
    }
    return resolve(payload);
  }
}

export async function callBackground(
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

  if (!port.onMessage.hasListeners()) {
    throw new Error("Listeners not installed on devtools port");
  }

  if (isNotification(options)) {
    try {
      port.postMessage(message);
    } catch (error) {
      throw new Error(`Error sending devtools notification: ${error.message}`);
    }
  } else {
    return new Promise((resolve, reject) => {
      devtoolsHandlers.set(nonce, [resolve, reject]);
      try {
        port.postMessage(message);
      } catch (error) {
        reject(new Error(`Error sending devtools message: ${error.message}`));
      }
    });
  }
}

export function installPortListeners(port: Runtime.Port): void {
  // can't use isDevtoolsPage since this will be called from the pane and other places
  forbidBackgroundPage(
    "installPortListeners should only be called from the devtools"
  );

  port.onMessage.addListener(devtoolsMessageListener);
  port.onMessage.addListener(devtoolsEventListener);
}
