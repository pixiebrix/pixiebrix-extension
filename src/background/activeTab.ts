/** @file It's possible that some of these tabs might lose the permission in the meantime, we can't track that exactly */

import { uniq } from "lodash";

type TabId = number;

export async function getTabsWithAccess(): Promise<TabId[]> {
  const { origins } = await browser.permissions.getAll();
  const tabs = await browser.tabs.query({ url: origins });
  return uniq(tabs.map((x) => x.id));
}

/**
 * Runs a callback for each tab the extension has access to
 */
export async function forEachTab<
  TCallback extends (target: { tabId: number }) => void
>(callback: TCallback): Promise<void> {
  for (const tabId of await getTabsWithAccess()) {
    callback({ tabId });
  }
}

/**
 * Runs an asynchronous callback for each tab the extension has access to
 * @returns A promise that resolves when all the callbacks have resolved
 */
export async function forEachTabAsync<
  TCallback extends (target: { tabId: number }) => Promise<void>
>(callback: TCallback): Promise<Array<PromiseSettledResult<void>>> {
  const promises: Array<Promise<void>> = [];
  for (const tabId of await getTabsWithAccess()) {
    promises.push(callback({ tabId }));
  }

  return Promise.allSettled(promises);
}
