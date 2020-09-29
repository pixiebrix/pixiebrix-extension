import { HISTORY_STATE_UPDATED } from "@/messaging/constants";

function initNavigation() {
  chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    console.debug("onHistoryStateUpdated", details);
    const { tabId } = details;
    chrome.tabs.sendMessage(tabId, { type: HISTORY_STATE_UPDATED });
  });
}

export default initNavigation;
