import {
  notifyNavigation,
  reactivate as reactivateExtensions,
} from "@/contentScript/lifecycle";
import { liftBackground } from "@/background/protocol";

function initNavigation(): void {
  chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    console.debug("onHistoryStateUpdated", details);
    const { tabId } = details;
    notifyNavigation(tabId);
  });
}

export const reactivate = liftBackground(
  "REACTIVATE",
  async () => {
    await reactivateExtensions(null);
  },
  { asyncResponse: false }
);

export default initNavigation;
