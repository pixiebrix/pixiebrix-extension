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

import { RunBlock } from "@/contentScript/executor";
import browser, { Runtime, Tabs } from "webextension-polyfill";
import { BusinessError } from "@/errors";
import { expectContext } from "@/utils/expectContext";
import { asyncLoop } from "@/utils";
import { getLinkedApiClient } from "@/services/apiClient";
import { JsonObject } from "type-fest";
import { MessengerMeta } from "webext-messenger";
import { linkChildTab, runBrick } from "@/contentScript/messenger/api";
import { Target } from "@/types";
import { TabId } from "@/background/devtools/contract";
import { RemoteExecutionError } from "@/blocks/errors";
import pDefer from "p-defer";

const tabToOpener = new Map<number, number>();
const tabToTarget = new Map<number, number>();
// TODO: One tab could have multiple targets, but `tabToTarget` currenly only supports one at a time

export async function waitForTargetByUrl(url: string): Promise<Target> {
  const { promise, resolve } = pDefer<Target>();
  browser.webNavigation.onCommitted.addListener(
    function wait({ tabId, frameId }): void {
      resolve({ tabId, frameId });
      browser.webNavigation.onCommitted.removeListener(wait);
    },
    {
      url: [
        {
          urlMatches: url,
        },
      ],
    }
  );
  return promise;
}

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
  return runBrick(opener, subRequest);
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

  await asyncLoop(tabs, async (tab) => {
    if (tab.id === sourceTabId) {
      return;
    }

    try {
      const response = runBrick({ tabId: tab.id }, subRequest);
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
  return runBrick({ tabId: target }, subRequest);
}

export async function openTab(
  this: MessengerMeta,
  createProperties: Tabs.CreateCreatePropertiesType
): Promise<void> {
  // Natively links the new tab to its opener + opens it right next to it
  const openerTabId = this.trace[0].tab.id;
  const tab = await browser.tabs.create({ ...createProperties, openerTabId });

  // FIXME: include frame information here
  tabToTarget.set(openerTabId, tab.id);
  tabToOpener.set(tab.id, openerTabId);
}

async function linkTabListener(tab: Tabs.Tab): Promise<void> {
  if (tab.openerTabId) {
    tabToOpener.set(tab.id, tab.openerTabId);
    tabToTarget.set(tab.openerTabId, tab.id);
    linkChildTab({ tabId: tab.openerTabId }, tab.id);
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
  await browser.tabs.remove(this.trace[0].tab.id);
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
