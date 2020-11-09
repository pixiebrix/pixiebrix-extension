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
  MESSAGE_CONTENT_SCRIPT_READY,
} from "@/contentScript/executor";
import { browser, Runtime, Tabs } from "webextension-polyfill-ts";
import { MESSAGE_PREFIX } from "@/background/protocol";
import { RenderedArgs } from "@/core";
import { isBackgroundPage, isContentScript } from "webext-detect-page";

const MESSAGE_RUN_BLOCK_OPENER = `${MESSAGE_PREFIX}RUN_BLOCK_OPENER`;
const MESSAGE_RUN_BLOCK_TARGET = `${MESSAGE_PREFIX}RUN_BLOCK_TARGET`;
const MESSAGE_ACTIVATE_TAB = `${MESSAGE_PREFIX}MESSAGE_ACTIVATE_TAB`;
const MESSAGE_CLOSE_TAB = `${MESSAGE_PREFIX}MESSAGE_CLOSE_TAB`;

const tabToOpener = new Map<number, number>();
const tabToTarget = new Map<number, number>();
const tabReady = new Map<number, boolean>();

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface WaitOptions {
  maxWaitMillis: number;
}

async function waitReady(
  tabId: number,
  { maxWaitMillis }: WaitOptions = { maxWaitMillis: 5000 }
): Promise<boolean> {
  const startTime = Date.now();
  while (!tabReady.get(tabId)) {
    if (Date.now() - startTime > maxWaitMillis) {
      throw new Error(`Tab ${tabId} was not ready after ${maxWaitMillis}ms`);
    }
    await sleep(30);
  }
  return tabReady.get(tabId);
}

function backgroundListener(
  request: RunBlockAction,
  sender: Runtime.MessageSender
): Promise<unknown> | undefined {
  if (sender.id !== browser.runtime.id) {
    return;
  }

  switch (request.type) {
    case MESSAGE_RUN_BLOCK_OPENER: {
      const opener = tabToOpener.get(sender.tab.id);

      if (!opener) {
        return Promise.reject("Sender tab has no opener");
      }

      return new Promise((resolve) => {
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
    case MESSAGE_RUN_BLOCK_TARGET: {
      const target = tabToTarget.get(sender.tab.id);

      if (!target) {
        return Promise.reject("Sender tab has no target");
      }

      return waitReady(target).then(() => {
        return browser.tabs.sendMessage(target, {
          type: CONTENT_MESSAGE_RUN_BLOCK,
          payload: {
            sourceTabId: sender.tab.id,
            ...request.payload,
          },
        });
      });
    }
    case MESSAGE_ACTIVATE_TAB: {
      return new Promise((resolve) => {
        browser.tabs
          .update(sender.tab.id, {
            active: true,
          })
          // ignore the returned tab
          .then(() => resolve());
      });
    }
    case MESSAGE_CLOSE_TAB: {
      return new Promise<unknown>((resolve) => {
        browser.tabs.remove(sender.tab.id).then(resolve);
      });
    }
    case MESSAGE_CONTENT_SCRIPT_READY: {
      console.debug(`Marked tab ${sender.tab.id} as ready`);
      tabReady.set(sender.tab.id, true);
      return Promise.resolve();
    }
    default: {
      return;
    }
  }
}

function linkTabListener(tab: Tabs.Tab): void {
  if (tab.openerTabId) {
    tabToOpener.set(tab.id, tab.openerTabId);
    tabToTarget.set(tab.openerTabId, tab.id);
    linkChildTab(tab.openerTabId, tab.id).catch((reason) => {
      console.warn("Error linking child tab", reason);
    });
  }
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

export async function activateTab(): Promise<void> {
  if (!isContentScript()) {
    throw new Error("activateTab can only be run from a content script");
  }
  return await browser.runtime.sendMessage({
    type: MESSAGE_ACTIVATE_TAB,
    payload: {},
  });
}

export async function closeTab(): Promise<void> {
  if (!isContentScript()) {
    throw new Error("closeTab can only be run from a content script");
  }
  return await browser.runtime.sendMessage({
    type: MESSAGE_CLOSE_TAB,
    payload: {},
  });
}

export async function executeInTarget(
  blockId: string,
  blockArgs: RenderedArgs,
  options: RemoteBlockOptions
): Promise<unknown> {
  console.debug(`Running ${blockId} in the target tab`);
  return await browser.runtime.sendMessage({
    type: MESSAGE_RUN_BLOCK_TARGET,
    payload: {
      blockId,
      blockArgs,
      options,
    },
  });
}

export async function executeInOpener(
  blockId: string,
  blockArgs: RenderedArgs,
  options: RemoteBlockOptions
): Promise<unknown> {
  console.debug(`Running ${blockId} in the opener tab`);
  return await browser.runtime.sendMessage({
    type: MESSAGE_RUN_BLOCK_OPENER,
    payload: {
      blockId,
      blockArgs,
      options,
    },
  });
}

export default initExecutor;
