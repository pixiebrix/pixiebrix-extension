/** @file It's possible that some of these tabs might lose the permission in the meantime, we can't track that exactly */

import { updatePageEditor } from "@/pageEditor/messenger/api";
import { uniq } from "lodash";
import {
  type ActiveTab,
  addActiveTabListener,
  possiblyActiveTabs,
} from "webext-dynamic-content-scripts/distribution/active-tab";

type TabId = number;

function updateUI(tab: ActiveTab): void {
  // Inform pageEditor that it now has the ActiveTab permission, if it's open
  updatePageEditor({ page: `/pageEditor.html?tabId=${tab.id}` });
}

export default function initActiveTabTracking() {
  addActiveTabListener(updateUI);
}

export async function getTabsWithAccess(): Promise<TabId[]> {
  const { origins } = await browser.permissions.getAll();
  const tabs = await browser.tabs.query({ url: origins });
  // The union of browser.tabs.query and possiblyActiveTabs can contain duplicates, hence applying uniq
  return uniq([...tabs.map((x) => x.id), ...possiblyActiveTabs.keys()]);
}

export async function forEachTab<
  TCallback extends (target: { tabId: number }) => void
>(callback: TCallback): Promise<void> {
  for (const tabId of await getTabsWithAccess()) {
    callback({ tabId });
  }
}

export async function forEachTabAsync<
  TCallback extends (target: { tabId: number }) => Promise<void>
>(callback: TCallback): Promise<Array<PromiseSettledResult<void>>> {
  const promises: Array<Promise<void>> = [];
  for (const tabId of await getTabsWithAccess()) {
    promises.push(callback({ tabId }));
  }

  return Promise.allSettled(promises);
}
