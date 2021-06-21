// Adapted from: https://github.com/fregante/content-scripts-register-polyfill/blob/master/index.ts
// Changes: use onDOMContentLoaded instead of tabUpdated

import { patternToRegex } from "webext-patterns";
import { browser, WebNavigation } from "webextension-polyfill-ts";
import OnDOMContentLoadedDetailsType = WebNavigation.OnDOMContentLoadedDetailsType;

// @ts-expect-error Will be dropped by #535
async function p<T>(fn, ...args): Promise<T> {
  return new Promise((resolve, reject) => {
    // @ts-expect-error Will be dropped by #535
    fn(...args, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

async function isOriginPermitted(url: string): Promise<boolean> {
  return p(chrome.permissions.contains, {
    origins: [new URL(url).origin + "/*"],
  });
}

async function wasPreviouslyLoaded(
  tabId: number,
  frameId: number,
  loadCheck: string
): Promise<boolean> {
  const result = await p<boolean[]>(chrome.tabs.executeScript, tabId, {
    code: loadCheck,
    frameId: frameId,
    runAt: "document_start",
  });
  return result?.[0];
}

if (typeof chrome === "object" && !chrome.contentScripts) {
  chrome.contentScripts = {
    // The callback is only used by webextension-polyfill
    async register(contentScriptOptions, callback) {
      const {
        js = [],
        css = [],
        matchAboutBlank,
        matches,
        runAt,
      } = contentScriptOptions;
      // Injectable code; it sets a `true` property on `document` with the hash of the files as key.
      const loadCheck = `document[${JSON.stringify(
        JSON.stringify({ js, css })
      )}]`;

      const matchesRegex = patternToRegex(...matches);

      const listener = async ({
        tabId,
        frameId,
        url,
      }: OnDOMContentLoadedDetailsType): Promise<void> => {
        if (
          !url || // No URL = no permission;
          !matchesRegex.test(url) || // Manual `matches` glob matching
          !(await isOriginPermitted(url)) || // Permissions check
          (await wasPreviouslyLoaded(tabId, frameId, loadCheck)) // Double-injection avoidance
        ) {
          return;
        }

        // Mark as loaded first to avoid race conditions with multiple loads
        chrome.tabs.executeScript(tabId, {
          code: `${loadCheck} = true`,
          runAt: "document_start",
          frameId,
        });

        for (const file of css) {
          chrome.tabs.insertCSS(tabId, {
            ...file,
            matchAboutBlank,
            // Using allFrames here would lead to multiple injections from the top-level one. Instead we
            // manage each frame separately with the onDOMContentLoaded event
            allFrames: false,
            frameId,
            runAt: runAt ?? "document_start", // CSS should prefer `document_start` when unspecified
          });
        }

        for (const file of js) {
          console.debug("registerPolyfill:executeScript", {
            tabId,
            frameId,
            url,
          });

          chrome.tabs.executeScript(tabId, {
            ...file,
            matchAboutBlank,
            // Using allFrames here would lead to multiple injections from the top-level one. Instead we
            // manage each frame separately with the onDOMContentLoaded event
            allFrames: false,
            frameId,
            runAt,
          });
        }
      };

      // using onDOMContentLoaded because we run things at document_idle anyway. Would
      // have to listen to a different event if we were using start
      browser.webNavigation.onDOMContentLoaded.addListener(listener);
      const registeredContentScript = {
        async unregister() {
          browser.webNavigation.onDOMContentLoaded.removeListener(listener);
        },
      };

      if (typeof callback === "function") {
        callback(registeredContentScript);
      }

      return Promise.resolve(registeredContentScript);
    },
  };
}
