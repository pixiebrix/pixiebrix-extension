/** @file It's possible that some of these tabs might lose the permission in the meantime, we can't track that exactly */

// eslint-disable-next-line filenames/match-exported
import { safeParseUrl } from "@/utils";
import { canReceiveContentScript } from "@/utils/permissions";

type TabId = number;
type Origin = string;
export const possiblyActiveTabs = new Map<TabId, Origin>();

function track(tab: chrome.tabs.Tab): void {
  if (tab.url && canReceiveContentScript(tab.url)) {
    possiblyActiveTabs.set(tab.id, new URL(tab.url).origin);
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
    possiblyActiveTabs.delete(tabId);
  });
}

export async function doesTabHaveAccess({
  tabId,
  url,
}: {
  tabId?: TabId;
  url?: Origin;
}): Promise<boolean> {
  const { origin } = safeParseUrl(url);
  return (
    possiblyActiveTabs.get(tabId) === origin ||
    browser.permissions.contains({ origins: [url] })
  );
}

export async function getTabsWithAccess(): Promise<TabId[]> {
  const { origins } = await browser.permissions.getAll();
  const tabs = await browser.tabs.query({ url: origins });
  return [...tabs.map((x) => x.id), ...possiblyActiveTabs.keys()];
}
