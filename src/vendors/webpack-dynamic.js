// This is copied from https://github.com/crimx/webpack-target-webextension/blob/master/lib/background.js
// And adapted to fix the problem in https://github.com/crimx/webpack-target-webextension/issues/15

const isChrome = typeof chrome !== "undefined";

(isChrome ? chrome : browser).runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (
      message &&
      message.type === "WTW_INJECT" &&
      sender &&
      sender.tab &&
      sender.tab.id != null
    ) {
      let file = message.file;
      try {
        file = new URL(file).pathname;
      } catch {}
      if (file) {
        const details = {
          frameId: sender.frameId,
          file,
        };
        const callback = () => sendResponse();
        if (isChrome) {
          chrome.tabs.executeScript(sender.tab.id, details, callback);
        } else {
          browser.tabs.executeScript(sender.tab.id, details).then(callback);
        }
        return true;
      }
    }
  }
);
