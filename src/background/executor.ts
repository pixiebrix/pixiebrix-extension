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
  MESSAGE_CONTENT_SCRIPT_ECHO_SENDER,
  MESSAGE_CHECK_AVAILABILITY,
} from "@/contentScript/executor";
import { browser, Runtime, Tabs } from "webextension-polyfill-ts";
import { MESSAGE_PREFIX } from "@/background/protocol";
import { RenderedArgs } from "@/core";
import { isBackgroundPage, isContentScript } from "webext-detect-page";
import { emitDevtools } from "@/background/devtools/internal";
import { Availability } from "@/blocks/types";
import { BusinessError } from "@/errors";

const MESSAGE_RUN_BLOCK_OPENER = `${MESSAGE_PREFIX}RUN_BLOCK_OPENER`;
const MESSAGE_RUN_BLOCK_TARGET = `${MESSAGE_PREFIX}RUN_BLOCK_TARGET`;
const MESSAGE_RUN_BLOCK_BROADCAST = `${MESSAGE_PREFIX}RUN_BLOCK_BROADCAST`;
const MESSAGE_RUN_BLOCK_FRAME_NONCE = `${MESSAGE_PREFIX}RUN_BLOCK_FRAME_NONCE`;
const MESSAGE_ACTIVATE_TAB = `${MESSAGE_PREFIX}MESSAGE_ACTIVATE_TAB`;
const MESSAGE_CLOSE_TAB = `${MESSAGE_PREFIX}MESSAGE_CLOSE_TAB`;
const MESSAGE_OPEN_TAB = `${MESSAGE_PREFIX}MESSAGE_OPEN_TAB`;

const TOP_LEVEL_FRAME = 0;

interface Target {
  tabId: number;
  frameId: number;
}

const tabToOpener = new Map<number, number>();
const tabToTarget = new Map<number, number>();
const tabReady: { [tabId: string]: { [frameId: string]: boolean } } = {};
const nonceToTarget = new Map<string, Target>();

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface WaitOptions {
  maxWaitMillis?: number;
  isAvailable?: Availability;
}

type OpenTabAction = {
  type: typeof MESSAGE_OPEN_TAB;
  payload: Tabs.CreateCreatePropertiesType;
};

async function waitNonceReady(
  nonce: string,
  { maxWaitMillis, isAvailable }: WaitOptions = { maxWaitMillis: 10_000 }
) {
  const startTime = Date.now();

  const isReady = async () => {
    const target = nonceToTarget.get(nonce);
    if (target == null) {
      return false;
    }
    const frameReady = tabReady[target.tabId]?.[target.frameId] != null;
    if (!frameReady) {
      return false;
    }

    if (isAvailable) {
      return await browser.tabs.sendMessage(
        target.tabId,
        {
          type: MESSAGE_CHECK_AVAILABILITY,
          payload: { isAvailable },
        },
        { frameId: target.frameId }
      );
    } else {
      return true;
    }
  };

  while (!(await isReady())) {
    if (Date.now() - startTime > maxWaitMillis) {
      throw new BusinessError(
        `Nonce ${nonce} was not ready after ${maxWaitMillis}ms`
      );
    }
    await sleep(50);
  }
  return true;
}

async function waitReady(
  { tabId, frameId }: Target,
  { maxWaitMillis }: WaitOptions = { maxWaitMillis: 10_000 }
): Promise<boolean> {
  const startTime = Date.now();
  while (tabReady[tabId]?.[frameId] == null) {
    if (Date.now() - startTime > maxWaitMillis) {
      throw new BusinessError(
        `Tab ${tabId} was not ready after ${maxWaitMillis}ms`
      );
    }
    await sleep(50);
  }
  return true;
}

function backgroundListener(
  request: RunBlockAction | OpenTabAction,
  sender: Runtime.MessageSender
): Promise<unknown> | undefined {
  if (sender.id !== browser.runtime.id) {
    return;
  }

  switch (request.type) {
    case MESSAGE_RUN_BLOCK_OPENER: {
      const opener = tabToOpener.get(sender.tab.id);

      if (!opener) {
        return Promise.reject(new BusinessError("Sender tab has no opener"));
      }

      return new Promise((resolve) => {
        browser.tabs
          .sendMessage(
            opener,
            {
              type: CONTENT_MESSAGE_RUN_BLOCK,
              payload: {
                sourceTabId: sender.tab.id,
                ...request.payload,
              },
            },
            // for now, only support top-level frame as opener
            { frameId: TOP_LEVEL_FRAME }
          )
          .then(resolve);
      });
    }
    case MESSAGE_RUN_BLOCK_BROADCAST: {
      const tabTargets = Object.entries(tabReady).filter(
        ([tabId, ready]) =>
          tabId !== String(sender.tab.id) && ready[TOP_LEVEL_FRAME]
      );

      console.debug(`Broadcasting to ${tabTargets.length} top-level frames`, {
        sender: String(sender.tab.id),
        known: Array.from(Object.keys(tabReady)),
      });

      return Promise.allSettled(
        tabTargets.map(async ([tabId]) => {
          return browser.tabs.sendMessage(
            Number.parseInt(tabId, 10),
            {
              type: CONTENT_MESSAGE_RUN_BLOCK,
              payload: {
                sourceTabId: sender.tab.id,
                ...request.payload,
              },
            },
            // for now, only support top-level frame as opener
            { frameId: TOP_LEVEL_FRAME }
          );
        })
      ).then((results) => {
        return results
          .filter((x) => x.status === "fulfilled")
          .map((x) => (x as any).value);
      });
    }
    case MESSAGE_RUN_BLOCK_FRAME_NONCE: {
      const action = request as RunBlockAction;
      const { nonce, ...payload } = action.payload;

      console.debug(`Waiting for frame with nonce ${nonce} to be ready`);
      return waitNonceReady(nonce, {
        isAvailable: payload.options.isAvailable,
      }).then(() => {
        const target = nonceToTarget.get(nonce);
        console.debug(
          `Sending ${CONTENT_MESSAGE_RUN_BLOCK} to target tab ${target.tabId} frame ${target.frameId} (sender=${sender.tab.id})`
        );
        return browser.tabs.sendMessage(
          target.tabId,
          {
            type: CONTENT_MESSAGE_RUN_BLOCK,
            payload: {
              sourceTabId: sender.tab.id,
              ...payload,
            },
          },
          { frameId: target.frameId }
        );
      });
    }
    case MESSAGE_RUN_BLOCK_TARGET: {
      const target = tabToTarget.get(sender.tab.id);

      if (!target) {
        return Promise.reject(new BusinessError("Sender tab has no target"));
      }

      console.debug(`Waiting for target tab ${target} to be ready`);
      // for now, only support top-level frame as target
      return waitReady({ tabId: target, frameId: 0 }).then(() => {
        console.debug(
          `Sending ${CONTENT_MESSAGE_RUN_BLOCK} to target tab ${target} (sender=${sender.tab.id})`
        );
        return browser.tabs.sendMessage(
          target,
          {
            type: CONTENT_MESSAGE_RUN_BLOCK,
            payload: {
              sourceTabId: sender.tab.id,
              ...request.payload,
            },
          },
          { frameId: 0 }
        );
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
    case MESSAGE_OPEN_TAB: {
      return new Promise<unknown>((resolve, reject) => {
        browser.tabs
          .create(request.payload as Tabs.CreateCreatePropertiesType)
          .then((tab) => {
            // FIXME: include frame information here
            tabToTarget.set(sender.tab.id, tab.id);
            tabToOpener.set(tab.id, sender.tab.id);
            resolve();
          })
          .catch(reject);
      });
    }
    case MESSAGE_CONTENT_SCRIPT_READY: {
      const tabId = sender.tab.id;
      const { frameId } = sender;
      console.debug(`Marked tab ${tabId} (frame: ${frameId}) as ready`, {
        sender,
      });

      const url = new URL(sender.url);
      const nonce = url.searchParams.get("_pb");

      if (nonce) {
        console.debug(`Marking nonce as ready: ${nonce}`, {
          nonce,
          tabId,
          frameId,
        });
        nonceToTarget.set(nonce, { tabId, frameId });
      }

      if (!tabReady[tabId]) {
        tabReady[tabId] = {};
      }
      tabReady[tabId][frameId] = true;
      emitDevtools("ContentScriptReady", { tabId, frameId });
      return Promise.resolve();
    }
    case MESSAGE_CONTENT_SCRIPT_ECHO_SENDER: {
      return Promise.resolve(sender);
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
    linkChildTab({ tabId: tab.openerTabId, frameId: 0 }, tab.id).catch(
      (reason) => {
        console.warn("Error linking child tab", reason);
      }
    );
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

export async function openTab(
  options: Tabs.CreateCreatePropertiesType
): Promise<void> {
  return await browser.runtime.sendMessage({
    type: MESSAGE_OPEN_TAB,
    payload: options,
  });
}

const DEFAULT_MAX_RETRIES = 5;

export async function executeForNonce(
  nonce: string,
  blockId: string,
  blockArgs: RenderedArgs,
  options: RemoteBlockOptions
): Promise<unknown> {
  console.debug(`Running ${blockId} in content script with nonce ${nonce}`);

  const { maxRetries = DEFAULT_MAX_RETRIES } = options;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await browser.runtime.sendMessage({
        type: MESSAGE_RUN_BLOCK_FRAME_NONCE,
        payload: {
          nonce,
          blockId,
          blockArgs,
          options,
        },
      });
    } catch (err) {
      if (err?.message?.includes("Could not establish connection")) {
        console.debug(
          `Target not ready for ${blockId}. Retrying in ${
            100 * (retries + 1)
          }ms`
        );
        await sleep(250 * (retries + 1));
      } else {
        throw err;
      }
    }
    retries++;
  }

  throw new Error(`Unable to run ${blockId} after ${maxRetries} retries`);
}

export async function executeInTarget(
  blockId: string,
  blockArgs: RenderedArgs,
  options: RemoteBlockOptions
): Promise<unknown> {
  console.debug(`Running ${blockId} in the target tab`);

  const { maxRetries = DEFAULT_MAX_RETRIES } = options;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await browser.runtime.sendMessage({
        type: MESSAGE_RUN_BLOCK_TARGET,
        payload: {
          blockId,
          blockArgs,
          options,
        },
      });
    } catch (err) {
      if (err?.message?.includes("Could not establish connection")) {
        console.debug(
          `Target not ready for ${blockId}. Retrying in ${
            100 * (retries + 1)
          }ms`
        );
        await sleep(250 * (retries + 1));
      } else {
        throw err;
      }
    }
    retries++;
  }

  throw new Error(`Unable to run ${blockId} after ${maxRetries} retries`);
}

export async function executeInAll(
  blockId: string,
  blockArgs: RenderedArgs,
  options: RemoteBlockOptions
): Promise<unknown> {
  console.debug(`Running ${blockId} in all tabs`);
  return await browser.runtime.sendMessage({
    type: MESSAGE_RUN_BLOCK_BROADCAST,
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
