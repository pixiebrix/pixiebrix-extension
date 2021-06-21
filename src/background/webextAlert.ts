import { isBackgroundPage } from "webext-detect-page";

function windowAlert(message: string): void {
  const url = new URL("https://webext-alert.vercel.app");
  url.searchParams.set("title", chrome.runtime.getManifest().name);
  url.searchParams.set("message", message);

  const width = 420;
  const height = 150;

  chrome.windows.create({
    url: url.toString(),
    focused: true,
    height,
    width,
    top: Math.round((screen.availHeight - height) / 2),
    left: Math.round((screen.availWidth - width) / 2),
    type: "popup",
  });
}

const webextAlert = ((): typeof alert => {
  if (
    globalThis?.navigator.userAgent.includes("Firefox/") &&
    isBackgroundPage()
  ) {
    // Firefox doesn't support alert() in background pages
    return windowAlert;
  }

  return alert;
})();

export default webextAlert;
