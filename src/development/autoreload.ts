import { isChrome } from "@/helpers";

// In Chrome, `web-ext run` reloads the extension without reloading the manifest.
// This forces a full reload if the version hasn't changed since the last run.
if (process.env.ENVIRONMENT === "development" && isChrome) {
  const { version_name } = chrome.runtime.getManifest();

  if (localStorage.getItem("dev:last-version") === version_name) {
    localStorage.removeItem("dev:last-version");
    chrome.runtime.reload();
  }

  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "update") {
      localStorage.setItem("dev:last-version", version_name);
    }
  });
}
