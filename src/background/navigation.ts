import { notifyNavigation } from "@/contentScript/navigation";

function initNavigation(): void {
  chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    console.debug("onHistoryStateUpdated", details);
    const { tabId } = details;
    notifyNavigation(tabId);
  });
}

export default initNavigation;
