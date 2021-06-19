// Adapted from: https://github.com/fregante/content-scripts-register-polyfill/blob/master/index.ts
// Changes: use onDOMContentLoaded instead of tabUpdated

import { patternToRegex } from "webext-patterns";
import { browser, WebNavigation } from "webextension-polyfill-ts";
import OnDOMContentLoadedDetailsType = WebNavigation.OnDOMContentLoadedDetailsType;
import objectHash from "object-hash";

// @ts-expect-error
async function p<T>(fn, ...args): Promise<T> {
  return new Promise((resolve, reject) => {
    // @ts-expect-error
    fn(...args, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

const pending = new Set<string>();

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
        const requestHash = objectHash({
          tabId,
          frameId,
          url,
          loadCheck,
        });

        if (
          !url || // No URL = no permission;
          !matchesRegex.test(url) || // Manual `matches` glob matching
          !(await isOriginPermitted(url)) || // Permissions check
          (await wasPreviouslyLoaded(tabId, frameId, loadCheck)) // Double-injection avoidance
        ) {
          return;
        }

        if (pending.has(requestHash)) {
          console.warn("Double-injection detected", {
            tabId,
            frameId,
            url,
            options: {
              js,
              css,
            },
          });
          return;
        }

        pending.add(requestHash);

        // Mark as loaded first to avoid race conditions with multiple loads
        chrome.tabs.executeScript(tabId, {
          code: `${loadCheck} = true`,
          runAt: "document_start",
          frameId,
        });

        try {
          await Promise.allSettled(
            css.map(async (file) => {
              await p(chrome.tabs.insertCSS, tabId, {
                ...file,
                matchAboutBlank,
                // Using allFrames here would lead to multiple injections from the top-level one. Instead we
                // manage each frame separately with the onDOMContentLoaded event
                allFrames: false,
                frameId,
                runAt: runAt ?? "document_start", // CSS should prefer `document_start` when unspecified
              });
            })
          );

          await Promise.allSettled(
            js.map(async (file) => {
              console.debug("registerPolyfill:executeScript", {
                tabId,
                frameId,
                url,
              });
              return await p(chrome.tabs.executeScript, tabId, {
                ...file,
                matchAboutBlank,
                // Using allFrames here would lead to multiple injections from the top-level one. Instead we
                // manage each frame separately with the onDOMContentLoaded event
                allFrames: false,
                frameId,
                runAt,
              });
            })
          );
        } finally {
          pending.delete(requestHash);
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
