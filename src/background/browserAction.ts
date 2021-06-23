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

import { isBackgroundPage } from "webext-detect-page";
import { toggleActionPanel } from "@/contentScript/browserAction";
import { reportError } from "@/telemetry/logging";
import { injectContentScript } from "@/background/util";
import { browser, Runtime } from "webextension-polyfill-ts";
import { allowSender } from "@/actionPanel/protocol";
import { isErrorObject, sleep } from "@/utils";
import webextAlert from "./webextAlert";

export const MESSAGE_PREFIX = "@@pixiebrix/background/browserAction/";

export const REGISTER_ACTION_FRAME = `${MESSAGE_PREFIX}/REGISTER_ACTION_FRAME`;
export const FORWARD_FRAME_NOTIFICATION = `${MESSAGE_PREFIX}/FORWARD_ACTION_FRAME_NOTIFICATION`;

/**
 * Mapping from tabId to the nonce for the browser action iframe
 */
const tabNonces = new Map<number, string>();
const tabFrames = new Map<number, number>();

async function handleBrowserAction(tab: chrome.tabs.Tab): Promise<void> {
  // We're either getting a new frame, or getting rid of the existing one. Therefore, forget the old frame
  // id so we're not sending messages to a dead frame
  tabFrames.delete(tab.id);

  try {
    await injectContentScript({ tabId: tab.id, frameId: 0 });
    const nonce = await toggleActionPanel({ tabId: tab.id, frameId: 0 });
    tabNonces.set(tab.id, nonce);
  } catch (error: unknown) {
    if (isErrorObject(error)) {
      // Example error messages:
      // Cannot access a chrome:// URL
      // Cannot access a chrome-extension:// URL of different extension
      // Cannot access contents of url "chrome-extension://mpjjildhmpddojocokjkgmlkkkfjnepo/options.html#/". Extension manifest must request permission to access this host.
      // The extensions gallery cannot be scripted.
      if (
        /cannot be scripted|(chrome|about|extension):[/][/]/.test(error.message)
      ) {
        webextAlert("This is a special page that can’t be edited");
      } else {
        webextAlert("PixieBrix might not be compatible with this page");
        reportError(error);
      }
    }
  }
}

type RegisterActionFrameMessage = {
  type: typeof REGISTER_ACTION_FRAME;
  payload: { nonce: string };
};

type ForwardActionFrameNotification = {
  type: typeof FORWARD_FRAME_NOTIFICATION;
  payload: {
    type: string;
    meta?: object;
    payload: unknown;
  };
};

const RETRY_INTERVAL_MILLIS = 50;

async function forwardWhenReady(
  tabId: number,
  message: unknown
): Promise<void> {
  let frameId: number;
  do {
    frameId = tabFrames.get(tabId);
    if (frameId == null) {
      console.debug(`Action frame not ready for tab ${tabId}, waiting...`);
      await sleep(RETRY_INTERVAL_MILLIS);
    }
  } while (frameId == null);

  console.debug(`Forwarding message to action frame for tab: ${tabId}`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await browser.tabs.sendMessage(tabId, message, { frameId });
    } catch (error) {
      if (error?.message?.includes("Could not establish connection")) {
        await sleep(RETRY_INTERVAL_MILLIS);
      } else {
        throw error;
      }
    }
  }
}

function backgroundListener(
  request: RegisterActionFrameMessage | ForwardActionFrameNotification,
  sender: Runtime.MessageSender
): Promise<unknown> | undefined {
  if (allowSender(sender)) {
    switch (request.type) {
      case REGISTER_ACTION_FRAME: {
        const registerAction = request as RegisterActionFrameMessage;
        if (tabNonces.get(sender.tab.id) !== registerAction.payload.nonce) {
          console.warn("Action frame nonce mismatch", {
            expected: tabNonces.get(sender.tab.id),
            actual: registerAction.payload.nonce,
          });
        }
        console.debug("Setting action frame metadata", {
          tabId: sender.tab.id,
          frameId: sender.frameId,
        });
        tabFrames.set(sender.tab.id, sender.frameId);
        return;
      }
      case FORWARD_FRAME_NOTIFICATION: {
        const forwardAction = request as ForwardActionFrameNotification;
        return forwardWhenReady(sender.tab.id, forwardAction.payload).catch(
          reportError
        );
      }
      default: {
        // NOOP
      }
    }
  }
}

if (isBackgroundPage()) {
  chrome.browserAction.onClicked.addListener(handleBrowserAction);
  console.debug("Installed browserAction click listener");
  browser.runtime.onMessage.addListener(backgroundListener);
}
