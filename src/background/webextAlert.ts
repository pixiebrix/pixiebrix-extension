import {
  isBackgroundPage,
  isBackgroundWorker,
  isFirefox,
} from "webext-detect-page";

function windowAlert(message: string): void {
  const url = new URL(browser.runtime.getURL("alert.html"));
  url.searchParams.set("title", chrome.runtime.getManifest().name);
  url.searchParams.set("message", message);

  const width = 420;
  const height = 150;

  void browser.windows.create({
    url: url.href,
    focused: true,
    height,
    width,
    top: Math.round((screen.availHeight - height) / 2),
    left: Math.round((screen.availWidth - width) / 2),
    type: "popup",
  });
}

const webextAlert = ((): typeof alert => {
  if ((isFirefox() && isBackgroundPage()) || isBackgroundWorker()) {
    // Firefox and workers don't support alert() in background pages
    return windowAlert;
  }

  return alert;
})();

export default webextAlert;
