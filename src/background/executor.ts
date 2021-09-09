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
  linkChildTab,
  MESSAGE_CHECK_AVAILABILITY,
  MESSAGE_CONTENT_SCRIPT_READY,
  MESSAGE_RUN_BLOCK as CONTENT_MESSAGE_RUN_BLOCK,
  RemoteBlockOptions,
  RunBlockAction,
} from "@/contentScript/executor";
import { browser, Runtime, Tabs } from "webextension-polyfill-ts";
import { liftBackground, MESSAGE_PREFIX } from "@/background/protocol";
import { ActionType, Message, RegistryId, RenderedArgs } from "@/core";
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
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record<> doesn't allow labelled keys
const tabReady: { [tabId: string]: { [frameId: string]: boolean } } = {};
const nonceToTarget = new Map<string, Target>();

interface WaitOptions {
  maxWaitMillis?: number;
  isAvailable?: Availability;
}

type OpenTabAction = {
  type: typeof MESSAGE_OPEN_TAB;
  payload: Tabs.CreateCreatePropertiesType;
};

interface ObjectPayloadMessage<T extends ActionType = ActionType>
  extends Message<T> {
  payload: Record<string, unknown>;
}

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
      return browser.tabs.sendMessage(
        target.tabId,
        {
          type: MESSAGE_CHECK_AVAILABILITY,
          payload: { isAvailable },
        },
        { frameId: target.frameId }
      );
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
  { maxWaitMillis }: WaitOptions = { maxWaitMillis: 10_000 }
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
  async (request: ObjectPayloadMessage, sender) => {
    const opener = tabToOpener.get(sender.tab.id);

    if (!opener) {
      throw new BusinessError("Sender tab has no opener");
    }

    return browser.tabs.sendMessage(
      opener,
      {
        type: CONTENT_MESSAGE_RUN_BLOCK,
        payload: {
          sourceTabId: sender.tab.id,
          ...request.payload,
        },
      },
      // For now, only support top-level frame as opener
      { frameId: TOP_LEVEL_FRAME }
    );
  }
);

handlers.set(
  MESSAGE_RUN_BLOCK_BROADCAST,
  async (request: ObjectPayloadMessage, sender) => {
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
        browser.tabs.sendMessage(
          tabId,
          {
            type: CONTENT_MESSAGE_RUN_BLOCK,
            payload: {
              sourceTabId: sender.tab.id,
              ...request.payload,
            },
          },
          // For now, only support top-level frame as opener
          { frameId: TOP_LEVEL_FRAME }
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
  async (request: RunBlockAction, sender) => {
    const { nonce, ...payload } = request.payload;

    console.debug(`Waiting for frame with nonce ${nonce} to be ready`);
    await waitNonceReady(nonce, {
      isAvailable: payload.options.isAvailable,
    });

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
  }
);

handlers.set(
  MESSAGE_RUN_BLOCK_TARGET,
  async (request: ObjectPayloadMessage, sender) => {
    const target = tabToTarget.get(sender.tab.id);

    if (!target) {
      throw new BusinessError("Sender tab has no target");
    }

    console.debug(`Waiting for target tab ${target} to be ready`);
    // For now, only support top-level frame as target
    await waitReady({ tabId: target, frameId: 0 });
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
  }
);

handlers.set(MESSAGE_ACTIVATE_TAB, async (_, sender) => {
  await browser.tabs.update(sender.tab.id, {
    active: true,
  });
});

handlers.set(MESSAGE_CLOSE_TAB, async (_, sender) =>
  browser.tabs.remove(sender.tab.id)
);

handlers.set(MESSAGE_OPEN_TAB, async (request: OpenTabAction, sender) => {
  const tab = await browser.tabs.create(request.payload);
  // FIXME: include frame information here
  tabToTarget.set(sender.tab.id, tab.id);
  tabToOpener.set(tab.id, sender.tab.id);
});

handlers.set(MESSAGE_CONTENT_SCRIPT_READY, async (_, sender) => {
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
});

async function linkTabListener(tab: Tabs.Tab): Promise<void> {
  if (tab.openerTabId) {
    tabToOpener.set(tab.id, tab.openerTabId);
    tabToTarget.set(tab.openerTabId, tab.id);
    try {
      await linkChildTab({ tabId: tab.openerTabId, frameId: 0 }, tab.id);
    } catch (error: unknown) {
      console.warn("Error linking child tab", error);
    }
  }
}

function initExecutor(): void {
  expectContext("background");

  browser.tabs.onCreated.addListener(linkTabListener);
  browser.runtime.onMessage.addListener(handlers.asListener());
}

export async function activateTab(): Promise<void> {
  expectContext("contentScript");

  return browser.runtime.sendMessage({
    type: MESSAGE_ACTIVATE_TAB,
    payload: {},
  });
}

export async function whoAmI(
  this: MessengerMeta
): Promise<Runtime.MessageSender> {
  return this;
}

export async function closeTab(): Promise<void> {
  expectContext("contentScript");

  return browser.runtime.sendMessage({
    type: MESSAGE_CLOSE_TAB,
    payload: {},
  });
}

export async function openTab(
  options: Tabs.CreateCreatePropertiesType
): Promise<void> {
  return browser.runtime.sendMessage({
    type: MESSAGE_OPEN_TAB,
    payload: options,
  });
}

const DEFAULT_MAX_RETRIES = 5;

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
      if (getErrorMessage(error).includes("Could not establish connection")) {
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
