/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { Runtime, Tabs } from "webextension-polyfill";
import { expectContext } from "@/utils/expectContext";
import { asyncForEach } from "@/utils";
import { getLinkedApiClient } from "@/services/apiClient";
import { JsonObject } from "type-fest";
import { MessengerMeta } from "webext-messenger";
import { runBrick } from "@/contentScript/messenger/api";
import { Target } from "@/types";
import { RemoteExecutionError } from "@/blocks/errors";
import pDefer from "p-defer";
import { canAccessTab } from "webext-tools";
import { onTabClose } from "@/chrome";
// eslint-disable-next-line import/no-restricted-paths -- Type only
import type { RunBlock } from "@/contentScript/runBlockTypes";
import { BusinessError } from "@/errors/businessErrors";

type TabId = number;

// Used to determine which promise was resolved in a race
const TYPE_WAS_CLOSED = Symbol("Tab was closed");

const tabToOpener = new Map<TabId, TabId>();
const tabToTarget = new Map<TabId, TabId>();
// TODO: One tab could have multiple targets, but `tabToTarget` currenly only supports one at a time

async function safelyRunBrick({ tabId }: { tabId: number }, request: RunBlock) {
  if (!(await canAccessTab(tabId))) {
    throw new BusinessError("PixieBrix doesn't have access to the tab");
  }

  const result = await Promise.race([
    // If https://github.com/pixiebrix/webext-messenger/issues/67 is resolved, we don't need the listener
    onTabClose(tabId).then(() => TYPE_WAS_CLOSED),
    runBrick({ tabId }, request),
  ]);

  if (result === TYPE_WAS_CLOSED) {
    throw new BusinessError("The tab was closed");
  }

  return result;
}

export async function waitForTargetByUrl(url: string): Promise<Target> {
  const { promise, resolve } = pDefer<Target>();

  // This uses RE2, which is a regex-like syntax
  const urlMatches = url.replaceAll("?", "\\?");
  function wait({ tabId, frameId }: Target): void {
    resolve({ tabId, frameId });
    browser.webNavigation.onCommitted.removeListener(wait);
  }

  browser.webNavigation.onCommitted.addListener(wait, {
    url: [{ urlMatches }],
  });
  return promise;
}

/**
 * Run a brick in the window that opened the source window
 * @param request
 */
export async function requestRunInOpener(
  this: MessengerMeta,
  request: RunBlock
): Promise<unknown> {
  const sourceTabId = this.trace[0].tab.id;

  if (!tabToOpener.has(sourceTabId)) {
    throw new BusinessError("Sender tab has no opener");
  }

  const opener = {
    tabId: tabToOpener.get(sourceTabId),
  };
  const subRequest = { ...request, sourceTabId };
  return safelyRunBrick(opener, subRequest);
}

/**
 * Run a brick in the last window that was opened from the source window
 * @see openTab
 */
export async function requestRunInTarget(
  this: MessengerMeta,
  request: RunBlock
): Promise<unknown> {
  const sourceTabId = this.trace[0].tab.id;
  const target = tabToTarget.get(sourceTabId);

  if (!target) {
    throw new BusinessError("Sender tab has no target");
  }

  const subRequest = { ...request, sourceTabId };
  return safelyRunBrick({ tabId: target }, subRequest);
}

/**
 * Run a brick in the topmost frame of the window/tab
 */
export async function requestRunInTop(
  this: MessengerMeta,
  request: RunBlock
): Promise<unknown> {
  const sourceTabId = this.trace[0].tab.id;

  const subRequest = { ...request, sourceTabId };
  return safelyRunBrick({ tabId: sourceTabId }, subRequest);
}

export async function requestRunInBroadcast(
  this: MessengerMeta,
  request: RunBlock
): Promise<unknown[]> {
  const sourceTabId = this.trace[0].tab.id;
  const subRequest = { ...request, sourceTabId };

  const fulfilled = new Map<TabId, unknown>();
  const rejected = new Map<TabId, unknown>();

  const { origins } = await browser.permissions.getAll();
  const tabs = await browser.tabs.query({ url: origins });

  await asyncForEach(tabs, async (tab) => {
    if (tab.id === sourceTabId) {
      return;
    }

    try {
      const response = safelyRunBrick({ tabId: tab.id }, subRequest);
      fulfilled.set(tab.id, await response);
    } catch (error) {
      rejected.set(tab.id, error);
    }
  });

  if (rejected.size > 0) {
    console.warn(`Broadcast rejected for ${rejected.size} tabs`, { rejected });
  }

  return [...fulfilled].map(([, value]) => value);
}

export async function openTab(
  this: MessengerMeta,
  createProperties: Tabs.CreateCreatePropertiesType
): Promise<void> {
  // Natively links the new tab to its opener + opens it right next to it
  const openerTabId = this.trace[0].tab?.id;
  const tab = await browser.tabs.create({ ...createProperties, openerTabId });

  // FIXME: include frame information here
  tabToTarget.set(openerTabId, tab.id);
  tabToOpener.set(tab.id, openerTabId);
}

async function linkTabListener(tab: Tabs.Tab): Promise<void> {
  if (tab.openerTabId) {
    tabToOpener.set(tab.id, tab.openerTabId);
    tabToTarget.set(tab.openerTabId, tab.id);
  }
}

function initExecutor(): void {
  expectContext("background");

  browser.tabs.onCreated.addListener(linkTabListener);
}

export async function activateTab(this: MessengerMeta): Promise<void> {
  await browser.tabs.update(this.trace[0].tab.id, {
    active: true,
  });
}

export async function closeTab(this: MessengerMeta): Promise<void> {
  // Allow `closeTab` to return before closing the tab or else the Messenger won't be able to respond #2051
  setTimeout(async () => browser.tabs.remove(this.trace[0].tab.id), 100);
}

export async function whoAmI(
  this: MessengerMeta
): Promise<Runtime.MessageSender> {
  return this.trace[0];
}

interface ServerResponse {
  data?: JsonObject;
  error?: JsonObject;
}

export async function requestRunOnServer({ blockId, blockArgs }: RunBlock) {
  console.debug(`Running ${blockId} on the server`);
  const client = await getLinkedApiClient();

  const {
    data: { data, error },
  } = await client.post<ServerResponse>("/api/run/", {
    id: blockId,
    args: blockArgs,
  });

  if (error) {
    throw new RemoteExecutionError(
      "Error while executing brick remotely",
      // TODO: Ensure this error is reaching the caller in CS
      error
    );
  }

  return data;
}

export default initExecutor;
