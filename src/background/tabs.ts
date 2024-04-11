/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { type Tabs } from "webextension-polyfill";
import { expectContext } from "@/utils/expectContext";
import { type MessengerMeta } from "webext-messenger";
import { SessionMap } from "@/mv3/SessionStorage";
import { assertNotNullish } from "@/utils/nullishUtils";

type TabId = number;

// TODO: One tab could have multiple targets, but `tabToTarget` currently only supports one at a time
export const tabToTarget = new SessionMap<TabId>(
  "tabToTarget",
  import.meta.url,
);

// We shouldn't need to store this value, but Chrome loses it often
// https://bugs.chromium.org/p/chromium/issues/detail?id=967150
export const tabToOpener = new SessionMap<TabId>(
  "tabToOpener",
  import.meta.url,
);

function rememberOpener(newTabId: TabId, openerTabId: TabId): void {
  // FIXME: include frame information in tabToTarget
  void tabToTarget.set(String(openerTabId), newTabId);
  void tabToOpener.set(String(newTabId), openerTabId);
}

export async function openTab(
  this: MessengerMeta,
  createProperties: Tabs.CreateCreatePropertiesType,
): Promise<void> {
  // Natively links the new tab to its opener + opens it right next to it
  const openerTabId = this.trace[0]?.tab?.id;

  const newTab = await browser.tabs.create({
    ...createProperties,
    openerTabId,
  });

  if (openerTabId && newTab.id) {
    rememberOpener(newTab.id, openerTabId);
  }
}

export async function focusTab(this: MessengerMeta): Promise<void> {
  const id = this.trace[0]?.tab?.id;
  assertNotNullish(id, "focusTab can only be called from a tab");
  await browser.tabs.update(id, {
    active: true,
  });
}

export async function closeTab(this: MessengerMeta): Promise<void> {
  const id = this.trace[0]?.tab?.id;
  assertNotNullish(id, "closeTab can only be called from a tab");

  // Allow `closeTab` to return before closing the tab or else
  // the Messenger won't be able to respond #2051
  setTimeout(async () => browser.tabs.remove(id), 100);
}

async function linkTabListener({ id, openerTabId }: Tabs.Tab): Promise<void> {
  // `openerTabId` may be missing when created via `tabs.create()`
  if (id && openerTabId) {
    rememberOpener(id, openerTabId);
  }
}

function unlinkTabListener(id: number): void {
  void tabToTarget.delete(String(id));
  void tabToOpener.delete(String(id));
}

export default function initTabListener(): void {
  expectContext("background");

  browser.tabs.onCreated.addListener(linkTabListener);
  browser.tabs.onRemoved.addListener(unlinkTabListener);
}
