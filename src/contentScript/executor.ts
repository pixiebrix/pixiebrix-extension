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

export const MESSAGE_RUN_BLOCK = `${MESSAGE_PREFIX}RUN_BLOCK`;
export const MESSAGE_CONTENT_SCRIPT_READY = `${MESSAGE_PREFIX}SCRIPT_READY`;

export interface RemoteBlockOptions {
  ctxt: unknown;
  messageContext: MessageContext;
}

export interface RunBlockAction {
  type: typeof MESSAGE_RUN_BLOCK;
  payload: {
    sourceTabId?: number;
    blockId: string;
    blockArgs: { [param: string]: unknown };
    options: RemoteBlockOptions;
  };
}

const childTabs = new Set<number>();

function runBlockAction(
  request: RunBlockAction,
  sender: Runtime.MessageSender
): Promise<unknown> | undefined {
  const { type, payload } = request;

  if (allowSender(sender) && type === MESSAGE_RUN_BLOCK) {
    const { blockId, blockArgs, options } = payload;

    // TODO: validate sourceTabId here
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
  }
}

export const linkChildTab = liftContentScript(
  "TAB_OPENED",
  async (tabId: number) => {
    childTabs.add(tabId);
  },
  { asyncResponse: false }
);

if (isContentScript()) {
  browser.runtime.onMessage.addListener(runBlockAction);
}

export async function notifyReady(): Promise<void> {
  await browser.runtime.sendMessage({
    type: MESSAGE_CONTENT_SCRIPT_READY,
    payload: {},
  });
}
