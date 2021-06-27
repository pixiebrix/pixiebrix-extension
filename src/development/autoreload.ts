import { isChrome } from "@/helpers";

// In Chrome, `web-ext run` reloads the extension without reloading the manifest.
// This forces a full reload if the version hasn't changed since the last run.
if (process.env.ENVIRONMENT === "development" && isChrome) {
  const { version_name } = chrome.runtime.getManifest();

  if (localStorage.getItem("dev:last-version") === version_name) {
    // Removing the key ensures that it does not go into a reloading loop
    // by making the above condition false after the reload
    localStorage.removeItem("dev:last-version");
    chrome.runtime.reload();
  }

  // Chrome only calls this function if the extension is reloaded
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "update") {
      localStorage.setItem("dev:last-version", version_name);
    }
  });
}
