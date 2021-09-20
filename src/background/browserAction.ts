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

import { isBackgroundPage } from "webext-detect-page";
import * as contentScript from "@/contentScript/browserAction";
import { reportError } from "@/telemetry/logging";
import { ensureContentScript } from "@/background/util";
import { browser } from "webextension-polyfill-ts";
import { sleep } from "@/utils";
import { JsonObject, JsonValue } from "type-fest";
import { HandlerMap } from "@/messaging/protocol";
import { getErrorMessage } from "@/errors";
import { emitDevtools } from "@/background/devtools/internal";

const MESSAGE_PREFIX = "@@pixiebrix/background/browserAction/";
export const REGISTER_ACTION_FRAME = `${MESSAGE_PREFIX}/REGISTER_ACTION_FRAME`;
export const FORWARD_FRAME_NOTIFICATION = `${MESSAGE_PREFIX}/FORWARD_ACTION_FRAME_NOTIFICATION`;
export const SHOW_ACTION_FRAME = `${MESSAGE_PREFIX}/SHOW_ACTION_FRAME`;
export const HIDE_ACTION_FRAME = `${MESSAGE_PREFIX}/HIDE_ACTION_FRAME`;

// The sidebar is always injected to into the top level frame
const TOP_LEVEL_FRAME_ID = 0;

/**
 * Mapping from tabId to the message sequence number for forwarding. Reset/delete whenever the panel is shown/hidden.
 * Messages with a sequence number lower than the value are dropped/skipped.
 */
const tabSeqNumber = new Map<number, number>();

/**
 * Mapping from tabId to the nonce for the browser action iframe
 */
const tabNonces = new Map<number, string>();

/**
 * Mapping from tabId to the browser frame id for the browser action iframe
 */
const tabFrames = new Map<number, number>();

async function handleBrowserAction(
  tab: browser.tabs.Tab,
  fallback = true
): Promise<void> {
  // We're either getting a new frame, or getting rid of the existing one. Forget the old frame
  // id so we're not sending messages to a dead frame
  tabFrames.delete(tab.id);
  tabSeqNumber.delete(tab.id);

  try {
    await ensureContentScript({ tabId: tab.id, frameId: TOP_LEVEL_FRAME_ID });
    const nonce = await contentScript.toggleActionPanel({
      tabId: tab.id,
      frameId: TOP_LEVEL_FRAME_ID,
    });
    tabNonces.set(tab.id, nonce);

    // Inform editor that it now has the ActiveTab permission, if it's open
    emitDevtools("HistoryStateUpdate", {
      tabId: tab.id,
      frameId: TOP_LEVEL_FRAME_ID,
    });
  } catch (error: unknown) {
    // Avoid loops, report error
    if (!fallback) {
      reportError(error);
      return;
    }

    // The sidebar was not injected in the page, so we'll create a new tab instead
    // https://github.com/pixiebrix/pixiebrix-extension/issues/1334
    const options = await browser.tabs.create({
      url: browser.runtime.getURL("options.html"),
      openerTabId: tab.id,
    });
    await sleep(2000);
    await handleBrowserAction(options, false);
  }
}

type RegisterActionFrameMessage = {
  type: typeof REGISTER_ACTION_FRAME;
  payload: { nonce: string };
};

type ForwardActionFrameNotification = {
  type: typeof FORWARD_FRAME_NOTIFICATION;
  meta: { $seq: number };
  payload: {
    type: string;
    meta?: JsonObject;
    payload: JsonValue;
  };
};

const FORWARD_RETRY_INTERVAL_MILLIS = 50;

const FORWARD_RETRY_MAX_WAIT_MILLIS = 3000;

/**
 * Wait for the frame to register itself with the background page
 */
async function waitFrameId(tabId: number): Promise<number> {
  const start = Date.now();
  let frameId: number;
  do {
    frameId = tabFrames.get(tabId);
    if (frameId == null) {
      if (Date.now() - start > FORWARD_RETRY_MAX_WAIT_MILLIS) {
        throw new Error(
          `Action frame not ready for tab ${tabId} after ${FORWARD_RETRY_MAX_WAIT_MILLIS}ms`
        );
      }

      await sleep(FORWARD_RETRY_INTERVAL_MILLIS);
    }
  } while (frameId == null);

  return frameId;
}

/**
 * Send a message to the action frame (sidebar) for a page when it's ready
 * @param tabId the tab containing the action frame
 * @param seqNum sequence number of the message, to ensure they're sent in the correct order despite non-determinism
 * in when waitFrameId and content script ready are resolved
 * @param message the serializable message
 */
async function forwardWhenReady(
  tabId: number,
  seqNum: number,
  message: { type: string; meta?: JsonObject }
): Promise<void> {
  // `waitFrameId` and the `browser.tabs.sendMessage` loop cause non-determinism is what order the promises are
  // resolved. Therefore, we need to use a sequence number to ensure the messages get sent in the correct order.

  // Key assumption we're making: we're just forwarding render panel messages, which are safe to drop because the panel
  // should always just be showing the values of the latest message

  // We _might_ be able to have forwardWhenReady handle the seqNum itself instead of passing an internal value. However
  // I'm worried there would still some non-determinism because the source method calling forward from the content
  // script uses `void browser.runtime.sendMessage`, so the messages are not guaranteed to be ordered

  const frameId = await waitFrameId(tabId);

  const curSeqNum = tabSeqNumber.get(tabId);
  if (curSeqNum != null && curSeqNum > seqNum) {
    console.warn(
      "Skipping stale message (current: %d, message: %d)",
      curSeqNum,
      seqNum
    );
    return;
  }

  const messageWithSequenceNumber = {
    ...message,
    meta: { ...message.meta, $seq: seqNum },
  };

  console.debug(
    "Forwarding message %s to action frame for tab: %d (seq: %d)",
    message.type,
    tabId,
    seqNum
  );

  const start = Date.now();
  while (Date.now() - start < FORWARD_RETRY_MAX_WAIT_MILLIS) {
    const curSeqNum = tabSeqNumber.get(tabId);
    if (curSeqNum != null && curSeqNum > seqNum) {
      console.warn(
        "Skipping stale message (current: %d, message: %d)",
        curSeqNum,
        seqNum
      );
      return;
    }

    try {
      await browser.tabs.sendMessage(tabId, messageWithSequenceNumber, {
        frameId,
      });
      console.debug(
        "Forwarded message %s to action frame for tab: %d (seq: %d)",
        message.type,
        tabId,
        seqNum
      );
      // Message successfully received, so record latest sequence number for tab
      tabSeqNumber.set(tabId, seqNum);
      return;
    } catch (error: unknown) {
      if (getErrorMessage(error).includes("Could not establish connection")) {
        await sleep(FORWARD_RETRY_INTERVAL_MILLIS);
      } else {
        throw error;
      }
    }
  }

  throw new Error(
    `Action frame for tab ${tabId} not ready in ${FORWARD_RETRY_MAX_WAIT_MILLIS}ms`
  );
}

const handlers = new HandlerMap();

handlers.set(
  REGISTER_ACTION_FRAME,
  async (request: RegisterActionFrameMessage, sender) => {
    const tabId = sender.tab.id;
    const expected = tabNonces.get(tabId);
    if (expected != null && expected !== request.payload.nonce) {
      console.warn("Action frame nonce mismatch", {
        expected,
        actual: request.payload.nonce,
      });
    }

    console.debug("Setting action frame metadata", {
      tabId,
      frameId: sender.frameId,
    });
    tabFrames.set(tabId, sender.frameId);
    tabSeqNumber.delete(tabId);
  }
);

handlers.set(
  FORWARD_FRAME_NOTIFICATION,
  async (request: ForwardActionFrameNotification, sender) => {
    const tabId = sender.tab.id;
    return forwardWhenReady(tabId, request.meta.$seq, request.payload).catch(
      reportError
    );
  }
);

handlers.set(SHOW_ACTION_FRAME, async (_, sender) => {
  const tabId = sender.tab.id;
  tabFrames.delete(tabId);
  const nonce = await contentScript.showActionPanel({
    tabId,
    frameId: TOP_LEVEL_FRAME_ID,
  });
  console.debug("Setting action frame nonce", { sender, nonce });
  tabNonces.set(tabId, nonce);
  tabSeqNumber.delete(tabId);
});

handlers.set(HIDE_ACTION_FRAME, async (_, sender) => {
  const tabId = sender.tab.id;
  tabFrames.delete(tabId);
  await contentScript.hideActionPanel({ tabId, frameId: TOP_LEVEL_FRAME_ID });
  console.debug("Clearing action frame nonce", { sender });
  tabNonces.delete(tabId);
  tabSeqNumber.delete(tabId);
});

if (isBackgroundPage()) {
  browser.browserAction.onClicked.addListener(handleBrowserAction);
  console.debug("Installed browserAction click listener");
  browser.runtime.onMessage.addListener(handlers.asListener());
}
