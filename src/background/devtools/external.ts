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
  isErrorResponse,
  isNotification,
} from "@/messaging/protocol";
import { deserializeError } from "serialize-error";
import {
  BackgroundResponse,
  Nonce,
  PromiseHandler,
} from "@/background/devtools/contract";
import browser, { Runtime, WebNavigation } from "webextension-polyfill";
import { uuidv4 } from "@/types/helpers";
import { SimpleEvent } from "@/hooks/events";
import { forbidContext } from "@/utils/expectContext";
import { getErrorMessage } from "@/errors";

const devtoolsHandlers = new Map<Nonce, PromiseHandler>();

type NavigationDetails = WebNavigation.OnHistoryStateUpdatedDetailsType;

export const navigationEvent = new SimpleEvent<NavigationDetails>();

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

    resolve(payload);
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

  // Firefox does not support the API yet
  // https://github.com/pixiebrix/pixiebrix-extension/issues/679
  if (port.onMessage.hasListeners && !port.onMessage.hasListeners()) {
    throw new Error("Listeners not installed on devtools port");
  }

  if (isNotification(options)) {
    try {
      port.postMessage(message);
    } catch (error) {
      throw new Error(
        `Error sending devtools notification: ${getErrorMessage(error)}`
      );
    }
  } else {
    return new Promise((resolve, reject) => {
      devtoolsHandlers.set(nonce, [resolve, reject]);
      try {
        port.postMessage(message);
      } catch (error) {
        reject(
          new Error(`Error sending devtools message: ${getErrorMessage(error)}`)
        );
      }
    });
  }
}

export function installPortListeners(port: Runtime.Port): void {
  // Can't use isDevtoolsPage since this will be called from the pane and other places
  forbidContext(
    "background",
    "installPortListeners should only be called from the devtools"
  );

  port.onMessage.addListener(devtoolsMessageListener);
}
