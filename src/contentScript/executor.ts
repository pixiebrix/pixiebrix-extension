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
import blockRegistry from "@/blocks/registry";
import { BackgroundLogger } from "@/background/logging";
import { MessageContext } from "@/core";
import {
  MESSAGE_PREFIX,
  allowSender,
  liftContentScript,
} from "@/contentScript/backgroundProtocol";
import { isContentScript } from "webext-detect-page";
import { Availability } from "@/blocks/types";
import { checkAvailable } from "@/blocks/available";

export const MESSAGE_CHECK_AVAILABILITY = `${MESSAGE_PREFIX}CHECK_AVAILABILITY`;
export const MESSAGE_RUN_BLOCK = `${MESSAGE_PREFIX}RUN_BLOCK`;
export const MESSAGE_CONTENT_SCRIPT_READY = `${MESSAGE_PREFIX}SCRIPT_READY`;
export const MESSAGE_CONTENT_SCRIPT_ECHO_SENDER = `${MESSAGE_PREFIX}ECHO_SENDER`;

export interface RemoteBlockOptions {
  ctxt: unknown;
  messageContext: MessageContext;
  maxRetries?: number;
  isAvailable?: Availability;
}

export interface CheckAvailabilityAction {
  type: typeof MESSAGE_CHECK_AVAILABILITY;
  payload: {
    isAvailable: Availability;
  };
}

export interface RunBlockAction {
  type: typeof MESSAGE_RUN_BLOCK;
  payload: {
    sourceTabId?: number;
    nonce?: string;
    blockId: string;
    blockArgs: { [param: string]: unknown };
    options: RemoteBlockOptions;
  };
}

let sender: Runtime.MessageSender = null;
const childTabs = new Set<number>();

function runBlockAction(
  request: RunBlockAction | CheckAvailabilityAction,
  sender: Runtime.MessageSender
): Promise<unknown> | undefined {
  const { type } = request;

  if (!allowSender(sender)) {
    return;
  } else if (type === MESSAGE_RUN_BLOCK) {
    const { blockId, blockArgs, options } = (request as RunBlockAction).payload;
    // FIXME: validate sourceTabId here
    // if (!childTabs.has(sourceTabId)) {
    //   return Promise.reject("Unknown source tab id");
    // }
    return blockRegistry.lookup(blockId).then((block) => {
      const logger = new BackgroundLogger(options.messageContext);
      return block.run(blockArgs, {
        ctxt: options.ctxt,
        logger,
        root: document,
      });
    });
  } else if (type === MESSAGE_CHECK_AVAILABILITY) {
    const { isAvailable } = (request as CheckAvailabilityAction).payload;
    return checkAvailable(isAvailable);
  }
}

export const linkChildTab = liftContentScript(
  "TAB_OPENED",
  async (tabId: number) => {
    childTabs.add(tabId);
  },
  { asyncResponse: false }
);

export async function whoAmI(): Promise<Runtime.MessageSender> {
  if (sender) {
    return sender;
  }
  sender = await browser.runtime.sendMessage({
    type: MESSAGE_CONTENT_SCRIPT_ECHO_SENDER,
    payload: {},
  });
  return sender;
}

export async function notifyReady(): Promise<void> {
  void browser.runtime.sendMessage("pbReady");
  return browser.runtime.sendMessage({
    type: MESSAGE_CONTENT_SCRIPT_READY,
    payload: {},
  });
}

function addExecutorListener(): void {
  if (isContentScript()) {
    browser.runtime.onMessage.addListener(runBlockAction);
  } else {
    throw new Error(
      "addExecutorListener should only be called from the content script"
    );
  }
}

export default addExecutorListener;
