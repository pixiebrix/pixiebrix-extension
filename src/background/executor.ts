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

import {
  linkChildTab,
  RemoteBlockOptions,
  RunBlockAction,
  MESSAGE_RUN_BLOCK as CONTENT_MESSAGE_RUN_BLOCK,
} from "@/contentScript/executor";
import { browser, Runtime, Tabs } from "webextension-polyfill-ts";
import { MESSAGE_PREFIX } from "@/background/protocol";
import { RenderedArgs } from "@/core";
import { isBackgroundPage } from "webext-detect-page";

const MESSAGE_RUN_BLOCK = `${MESSAGE_PREFIX}RUN_BLOCK`;

const tabToOpener = new Map<number, number>();

function backgroundListener(
  request: RunBlockAction,
  sender: Runtime.MessageSender
): Promise<unknown> | undefined {
  if (request.type === MESSAGE_RUN_BLOCK) {
    const opener = tabToOpener.get(sender.tab.id);

    if (!opener) {
      return Promise.reject("Unexpected sender tab");
    }

    return new Promise<unknown>((resolve) => {
      browser.tabs
        .sendMessage(opener, {
          type: CONTENT_MESSAGE_RUN_BLOCK,
          payload: {
            sourceTabId: sender.tab.id,
            ...request.payload,
          },
        })
        .then(resolve);
    });
  }
}

function linkTabListener(tab: Tabs.Tab): void {
  tabToOpener.set(tab.id, tab.openerTabId);
  linkChildTab(tab.openerTabId, tab.id).catch((reason) => {
    console.warn("Error linking child tab", reason);
  });
}

function initExecutor(): void {
  if (!isBackgroundPage()) {
    throw new Error(
      "initExecutor can only be called from the background thread"
    );
  }

  browser.tabs.onCreated.addListener(linkTabListener);
  browser.runtime.onMessage.addListener(backgroundListener);
}

export async function executeInParent(
  blockId: string,
  blockArgs: RenderedArgs,
  options: RemoteBlockOptions
): Promise<unknown> {
  return await browser.runtime.sendMessage({
    type: MESSAGE_RUN_BLOCK,
    payload: {
      blockId,
      blockArgs,
      options,
    },
  });
}

export default initExecutor;
