/* eslint-disable filenames/match-exported */
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
  RemoteBlockOptions,
  RunBlockRequestAction,
} from "@/contentScript/executor";
import { browser, Runtime, Tabs } from "webextension-polyfill-ts";
import { liftBackground, MESSAGE_PREFIX } from "@/background/protocol";
import { RegistryId, RenderedArgs } from "@/core";
import { emitDevtools } from "@/background/devtools/internal";
import { Availability } from "@/blocks/types";
import { BusinessError, getErrorMessage } from "@/errors";
import { expectContext } from "@/utils/expectContext";
import { HandlerMap } from "@/messaging/protocol";
import { sleep } from "@/utils";
import { partition, zip } from "lodash";
import { getLinkedApiClient } from "@/services/apiClient";
import { JsonObject } from "type-fest";
import { MessengerMeta } from "webext-messenger";
import {
  checkAvailable,
  linkChildTab,
  runBlockInContentScript,
} from "@/contentScript/messenger/api";

const RUN_BLOCK = `${MESSAGE_PREFIX}RUN_BLOCK`;
const MESSAGE_RUN_BLOCK_OPENER = `${MESSAGE_PREFIX}RUN_BLOCK_OPENER`;
const MESSAGE_RUN_BLOCK_TARGET = `${MESSAGE_PREFIX}RUN_BLOCK_TARGET`;
const MESSAGE_RUN_BLOCK_BROADCAST = `${MESSAGE_PREFIX}RUN_BLOCK_BROADCAST`;
const MESSAGE_RUN_BLOCK_FRAME_NONCE = `${MESSAGE_PREFIX}RUN_BLOCK_FRAME_NONCE`;

const TOP_LEVEL_FRAME = 0;

interface Target {
  tabId: number;
  frameId: number;
}

const tabToOpener = new Map<number, number>();
const tabToTarget = new Map<number, number>();
// TODO: One tab could have multiple targets, but `tabToTarget` currenly only supports one at a time

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record<> doesn't allow labelled keys
const tabReady: { [tabId: string]: { [frameId: string]: boolean } } = {};
const nonceToTarget = new Map<string, Target>();

interface WaitOptions {
  maxWaitMillis?: number;
  isAvailable?: Availability;
}

async function waitNonceReady(
  nonce: string,
  { maxWaitMillis = 10_000, isAvailable }: WaitOptions = {}
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
      return checkAvailable(target, isAvailable);
    }

    return true;
  };

  // eslint-disable-next-line no-await-in-loop -- retry loop
  while (!(await isReady())) {
    if (Date.now() - startTime > maxWaitMillis) {
      throw new BusinessError(
        `Nonce ${nonce} was not ready after ${maxWaitMillis}ms`
      );
    }

    // eslint-disable-next-line no-await-in-loop -- retry loop
    await sleep(50);
  }

  return true;
}

async function waitReady(
  { tabId, frameId }: Target,
  { maxWaitMillis = 10_000 }: WaitOptions = {}
): Promise<boolean> {
  const startTime = Date.now();
  while (tabReady[tabId]?.[frameId] == null) {
    if (Date.now() - startTime > maxWaitMillis) {
      throw new BusinessError(
        `Tab ${tabId} was not ready after ${maxWaitMillis}ms`
      );
    }

    // eslint-disable-next-line no-await-in-loop -- retry loop
    await sleep(50);
  }

  return true;
}

const handlers = new HandlerMap();

handlers.set(
  MESSAGE_RUN_BLOCK_OPENER,
  async (request: RunBlockRequestAction, sender) => {
    const opener = tabToOpener.get(sender.tab.id);

    if (!opener) {
      throw new BusinessError("Sender tab has no opener");
    }

    return runBlockInContentScript(
      // For now, only support top-level frame as opener
      { tabId: opener, frameId: TOP_LEVEL_FRAME },
      {
        sourceTabId: sender.tab.id,
        ...request.payload,
      }
    );
  }
);

handlers.set(
  MESSAGE_RUN_BLOCK_BROADCAST,
  async (request: RunBlockRequestAction, sender) => {
    const tabIds = Object.entries(tabReady)
      .filter(
        ([tabId, ready]) =>
          tabId !== String(sender.tab.id) && ready[TOP_LEVEL_FRAME]
      )
      .map(([tabId]) => Number.parseInt(tabId, 10));

    console.debug(`Broadcasting to ${tabIds.length} ready top-level frames`, {
      // Convert to string for consistency with the types of `ready`
      sender: String(sender.tab.id),
      ready: Object.keys(tabReady),
    });

    const results = await Promise.allSettled(
      tabIds.map(async (tabId) =>
        runBlockInContentScript(
          {
            tabId,
            // For now, only support top-level frame as opener
            frameId: TOP_LEVEL_FRAME,
          },
          {
            sourceTabId: sender.tab.id,
            ...request.payload,
          }
        )
      )
    );

    const [fulfilled, rejected] = partition(
      zip(tabIds, results),
      ([, result]) => result.status === "fulfilled"
    );

    if (rejected.length > 0) {
      console.warn(`Broadcast rejected for ${rejected.length} tabs`, {
        reasons: Object.fromEntries(
          rejected.map(([tabId, result]) => [
            tabId,
            (result as PromiseRejectedResult).reason,
          ])
        ),
      });
    }

    return fulfilled.map(
      ([, result]) => (result as PromiseFulfilledResult<unknown>).value
    );
  }
);

handlers.set(
  MESSAGE_RUN_BLOCK_FRAME_NONCE,
  async (request: RunBlockRequestAction, sender) => {
    const { nonce, ...payload } = request.payload;

    console.debug(`Waiting for frame with nonce ${nonce} to be ready`);
    await waitNonceReady(nonce, {
      isAvailable: payload.options.isAvailable,
    });

    const target = nonceToTarget.get(nonce);
    console.debug(
      `Sending ${RUN_BLOCK} to target tab ${target.tabId} frame ${target.frameId} (sender=${sender.tab.id})`
    );
    return runBlockInContentScript(target, {
      sourceTabId: sender.tab.id,
      ...request.payload,
    });
  }
);

handlers.set(
  MESSAGE_RUN_BLOCK_TARGET,
  async (request: RunBlockRequestAction, sender) => {
    const target = tabToTarget.get(sender.tab.id);

    if (!target) {
      throw new BusinessError("Sender tab has no target");
    }

    console.debug(`Waiting for target tab ${target} to be ready`);
    // For now, only support top-level frame as target
    await waitReady({ tabId: target, frameId: 0 });
    console.debug(
      `Sending ${RUN_BLOCK} to target tab ${target} (sender=${sender.tab.id})`
    );
    return runBlockInContentScript(
      { tabId: target, frameId: 0 },
      {
        sourceTabId: sender.tab.id,
        ...request.payload,
      }
    );
  }
);

export async function openTab(
  this: MessengerMeta,
  createProperties: Tabs.CreateCreatePropertiesType
): Promise<void> {
  // Natively links the new tab to its opener + opens it right next to it
  const openerTabId = this.tab.id;
  const tab = await browser.tabs.create({ ...createProperties, openerTabId });

  // FIXME: include frame information here
  tabToTarget.set(openerTabId, tab.id);
  tabToOpener.set(tab.id, openerTabId);
}

export async function markTabAsReady(this: MessengerMeta) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment -- Not applicable to this pattern
  const sender = this;
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
}

async function linkTabListener(tab: Tabs.Tab): Promise<void> {
  if (tab.openerTabId) {
    tabToOpener.set(tab.id, tab.openerTabId);
    tabToTarget.set(tab.openerTabId, tab.id);
    linkChildTab({ tabId: tab.openerTabId, frameId: 0 }, tab.id);
  }
}

function initExecutor(): void {
  expectContext("background");

  browser.tabs.onCreated.addListener(linkTabListener);
  browser.runtime.onMessage.addListener(handlers.asListener());
}

export async function activateTab(this: MessengerMeta): Promise<void> {
  await browser.tabs.update(this.tab.id, {
    active: true,
  });
}

export async function closeTab(this: MessengerMeta): Promise<void> {
  await browser.tabs.remove(this.tab.id);
}

export async function whoAmI(
  this: MessengerMeta
): Promise<Runtime.MessageSender> {
  return this;
}

const DEFAULT_MAX_RETRIES = 5;

// Partial error messages for determining whether an error indicates the target is not ready yet
const NOT_READY_PARTIAL_MESSAGES = [
  // Chrome/browser message
  "Could not establish connection",
  // `webext-messenger` error
  "No handlers registered in receiving end",
];

async function retrySend<T extends (...args: unknown[]) => Promise<unknown>>(
  send: T,
  maxRetries = DEFAULT_MAX_RETRIES
) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // eslint-disable-next-line no-await-in-loop -- retry loop
      return await send();
    } catch (error: unknown) {
      const message = getErrorMessage(error);

      if (NOT_READY_PARTIAL_MESSAGES.some((query) => message.includes(query))) {
        console.debug(`Target not ready. Retrying in ${100 * (retries + 1)}ms`);
        // eslint-disable-next-line no-await-in-loop -- retry loop
        await sleep(250 * (retries + 1));
      } else {
        throw error;
      }
    }

    retries++;
  }

  throw new Error("Could not establish connection");
}

export async function executeForNonce(
  nonce: string,
  blockId: string,
  blockArgs: RenderedArgs,
  options: RemoteBlockOptions
): Promise<unknown> {
  console.debug(`Running ${blockId} in content script with nonce ${nonce}`);

  const { maxRetries = DEFAULT_MAX_RETRIES } = options;

  return retrySend(
    async () =>
      browser.runtime.sendMessage({
        type: MESSAGE_RUN_BLOCK_FRAME_NONCE,
        payload: {
          nonce,
          blockId,
          blockArgs,
          options,
        },
      }),
    maxRetries
  );
}

export async function executeInTarget(
  blockId: string,
  blockArgs: RenderedArgs,
  options: RemoteBlockOptions
): Promise<unknown> {
  console.debug(`Running ${blockId} in the target tab`);

  const { maxRetries = DEFAULT_MAX_RETRIES } = options;

  return retrySend(
    async () =>
      browser.runtime.sendMessage({
        type: MESSAGE_RUN_BLOCK_TARGET,
        payload: {
          blockId,
          blockArgs,
          options,
        },
      }),
    maxRetries
  );
}

export async function executeInAll(
  blockId: string,
  blockArgs: RenderedArgs,
  options: RemoteBlockOptions
): Promise<unknown> {
  console.debug(`Running ${blockId} in all ready tabs`);
  return browser.runtime.sendMessage({
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
  return browser.runtime.sendMessage({
    type: MESSAGE_RUN_BLOCK_OPENER,
    payload: {
      blockId,
      blockArgs,
      options,
    },
  });
}

export const executeOnServer = liftBackground(
  "EXECUTE_ON_SERVER",
  async (blockId: RegistryId, blockArgs: RenderedArgs) => {
    console.debug(`Running ${blockId} on the server`);
    return (await getLinkedApiClient()).post<{
      data?: JsonObject;
      error?: JsonObject;
    }>("/api/run/", {
      id: blockId,
      args: blockArgs,
    });
  }
);

export default initExecutor;
