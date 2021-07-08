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
import * as contentScript from "@/contentScript/browserAction";
import { reportError } from "@/telemetry/logging";
import { ensureContentScript, showErrorInOptions } from "@/background/util";
import { browser, Runtime } from "webextension-polyfill-ts";
import { allowSender } from "@/actionPanel/protocol";
import { isPrivatePageError, sleep } from "@/utils";
import { JsonObject, JsonValue } from "type-fest";

const MESSAGE_PREFIX = "@@pixiebrix/background/browserAction/";
export const REGISTER_ACTION_FRAME = `${MESSAGE_PREFIX}/REGISTER_ACTION_FRAME`;
export const FORWARD_FRAME_NOTIFICATION = `${MESSAGE_PREFIX}/FORWARD_ACTION_FRAME_NOTIFICATION`;
export const SHOW_ACTION_FRAME = `${MESSAGE_PREFIX}/SHOW_ACTION_FRAME`;
export const HIDE_ACTION_FRAME = `${MESSAGE_PREFIX}/HIDE_ACTION_FRAME`;

// The sidebar is always injected to into the top level frame
const TOP_LEVEL_FRAME_ID = 0;

/**
 * Mapping from tabId to the nonce for the browser action iframe
 */
const tabNonces = new Map<number, string>();

/**
 * Mapping from tabId to the browser frame id for the browser action iframe
 */
const tabFrames = new Map<number, number>();

async function handleBrowserAction(tab: chrome.tabs.Tab): Promise<void> {
  // We're either getting a new frame, or getting rid of the existing one. Forget the old frame
  // id so we're not sending messages to a dead frame
  tabFrames.delete(tab.id);

  try {
    await ensureContentScript({ tabId: tab.id, frameId: TOP_LEVEL_FRAME_ID });
    const nonce = await contentScript.toggleActionPanel({
      tabId: tab.id,
      frameId: TOP_LEVEL_FRAME_ID,
    });
    tabNonces.set(tab.id, nonce);
  } catch (error: unknown) {
    if (isPrivatePageError(error)) {
      void showErrorInOptions(
        "ERR_BROWSER_ACTION_TOGGLE_SPECIAL_PAGE",
        tab.index
      );
      return;
    }

    // Firefox does not catch injection errors so we don't get a specific error message
    // https://github.com/pixiebrix/pixiebrix-extension/issues/579#issuecomment-866451242
    await showErrorInOptions("ERR_BROWSER_ACTION_TOGGLE", tab.index);

    // Only report unknown-reason errors
    reportError(error);
  }
}

type ShowFrameMessage = {
  type: typeof SHOW_ACTION_FRAME;
};

type HideFrameMessage = {
  type: typeof HIDE_ACTION_FRAME;
};

type RegisterActionFrameMessage = {
  type: typeof REGISTER_ACTION_FRAME;
  payload: { nonce: string };
};

type ForwardActionFrameNotification = {
  type: typeof FORWARD_FRAME_NOTIFICATION;
  payload: {
    type: string;
    meta?: JsonObject;
    payload: JsonValue;
  };
};

const FORWARD_RETRY_INTERVAL_MILLIS = 50;

async function forwardWhenReady(
  tabId: number,
  message: unknown
): Promise<void> {
  let frameId: number;
  do {
    frameId = tabFrames.get(tabId);
    if (frameId == null) {
      console.debug(`Action frame not ready for tab ${tabId}, waiting...`);
      await sleep(FORWARD_RETRY_INTERVAL_MILLIS);
    }
  } while (frameId == null);

  console.debug(`Forwarding message to action frame for tab: ${tabId}`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await browser.tabs.sendMessage(tabId, message, { frameId });
    } catch (error) {
      if (error?.message?.includes("Could not establish connection")) {
        await sleep(FORWARD_RETRY_INTERVAL_MILLIS);
      } else {
        throw error;
      }
    }
  }
}

function backgroundMessageListener(
  request:
    | RegisterActionFrameMessage
    | ForwardActionFrameNotification
    | ShowFrameMessage
    | HideFrameMessage,
  sender: Runtime.MessageSender
): Promise<unknown> | void {
  if (!allowSender(sender)) {
    return;
  }

  const tabId = sender.tab.id;

  switch (request.type) {
    case REGISTER_ACTION_FRAME: {
      const action = request as RegisterActionFrameMessage;
      if (tabNonces.get(tabId) !== action.payload.nonce) {
        console.warn("Action frame nonce mismatch", {
          expected: tabNonces.get(tabId),
          actual: action.payload.nonce,
        });
      }
      console.debug("Setting action frame metadata", {
        tabId,
        frameId: sender.frameId,
      });
      tabFrames.set(tabId, sender.frameId);
      return;
    }
    case FORWARD_FRAME_NOTIFICATION: {
      const action = request as ForwardActionFrameNotification;
      return forwardWhenReady(tabId, action.payload).catch(reportError);
    }
    case SHOW_ACTION_FRAME: {
      tabFrames.delete(tabId);
      return contentScript
        .showActionPanel({ tabId, frameId: TOP_LEVEL_FRAME_ID })
        .then((nonce) => {
          console.debug("Setting action frame nonce", { sender, nonce });
          tabNonces.set(tabId, nonce);
        });
    }
    case HIDE_ACTION_FRAME: {
      tabFrames.delete(tabId);
      return contentScript
        .hideActionPanel({ tabId, frameId: TOP_LEVEL_FRAME_ID })
        .then(() => {
          console.debug("Clearing action frame nonce", { sender, nonce });
          tabNonces.delete(tabId);
        });
    }
    default: {
      // NOOP
    }
  }
}

if (isBackgroundPage()) {
  chrome.browserAction.onClicked.addListener(handleBrowserAction);
  console.debug("Installed browserAction click listener");
  browser.runtime.onMessage.addListener(backgroundMessageListener);
}
