/** @file It's possible that some of these tabs might lose the permission in the meantime, we can't track that exactly */

import { updatePageEditor } from "@/pageEditor/messenger/api";
import { canReceiveContentScript } from "@/utils/permissions";
import browser from "webextension-polyfill";

type TabId = number;
type Origin = string;
export const possiblyActiveTabs = new Map<TabId, Origin>();

function track(tab: chrome.tabs.Tab): void {
  if (tab.url && canReceiveContentScript(tab.url)) {
    console.debug("ActiveTab added:", tab.id, tab.url);
    possiblyActiveTabs.set(tab.id, new URL(tab.url).origin);

    // Inform pageEditor that it now has the ActiveTab permission, if it's open
    updatePageEditor({ page: `/pageEditor.html?tabId=${tab.id}` });
  }
}

export default function initActiveTabTracking() {
  // Using the `chrome.*` API because the types are more complete here
  chrome.browserAction.onClicked.addListener(track);
  chrome.contextMenus.onClicked.addListener((_, tab) => {
    track(tab);
  });

  chrome.commands.onCommand.addListener((_, tab) => {
    track(tab);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    console.debug("ActiveTab removed:", tabId);
    possiblyActiveTabs.delete(tabId);
  });
}

export async function getTabsWithAccess(): Promise<TabId[]> {
  const { origins } = await browser.permissions.getAll();
  const tabs = await browser.tabs.query({ url: origins });
  return [...tabs.map((x) => x.id), ...possiblyActiveTabs.keys()];
}
