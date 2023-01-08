/** @file It's possible that some of these tabs might lose the permission in the meantime, we can't track that exactly */

import { updatePageEditor } from "@/pageEditor/messenger/api";
import { isScriptableUrl } from "@/utils/permissions";
import {
  type ActiveTab,
  onActiveTab,
  possiblyActiveTabs,
} from "webext-dynamic-content-scripts/active-tab";

type TabId = number;

function updateUI(tab: ActiveTab): void {
  if (isScriptableUrl(tab.origin)) {
    // Inform pageEditor that it now has the ActiveTab permission, if it's open
    updatePageEditor({ page: `/pageEditor.html?tabId=${tab.id}` });
  }
}

export default function initActiveTabTracking() {
  onActiveTab(updateUI);
}

export async function getTabsWithAccess(): Promise<TabId[]> {
  const { origins } = await browser.permissions.getAll();
  const tabs = await browser.tabs.query({ url: origins });
  return [...tabs.map((x) => x.id), ...possiblyActiveTabs.keys()];
}

export async function forEachTab<
  TCallback extends (target: { tabId: number }) => void
>(callback: TCallback): Promise<void> {
  for (const tabId of await getTabsWithAccess()) {
    callback({ tabId });
  }
}
