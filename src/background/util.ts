/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { isBackgroundPage } from "webext-detect-page";
import { browser } from "webextension-polyfill-ts";
import { getAdditionalPermissions } from "webext-additional-permissions";
import { patternToRegex } from "webext-patterns";

export type Target = {
  tabId: number;
  frameId: number;
};

/** Checks whether a URL has permanent permissions and therefore whether `webext-dynamic-content-scripts` already registered the scripts */
export async function isContentScriptRegistered(url: string): Promise<boolean> {
  const { origins } = await getAdditionalPermissions({
    strictOrigins: false,
  });

  return patternToRegex(...origins).test(url);
}

interface TargetState {
  url: string;
  installed: boolean;
  ready: boolean;
}

/** Fetches the URL from a tab/frame. Return value is empty if it's unknowable (likely because we don't have permission to access it) */
export async function getTargetState(
  target: Target
): Promise<TargetState | void> {
  if (!isBackgroundPage()) {
    throw new Error(
      "getTargetState can only be called from the background page"
    );
  }

  return browser.tabs
    .executeScript(target.tabId, {
      // This imitates the new chrome.scripting API by wrapping a function in a IIFE
      code: `(${() => ({
        url: location.href,
        installed: Symbol.for("pixiebrix-content-script") in window,
        ready: (window as any).pbReady,
      })})()`,
      frameId: target.frameId,
    })
    .then(([state]: [TargetState]) => state)
    .catch(() => {});
}

export async function onReadyNotification(signal: AbortSignal): Promise<true> {
  return new Promise((resolve) => {
    const onMessage = (message: unknown) => {
      if (message === "pbReady") {
        resolve(true);
        browser.runtime.onMessage.removeListener(onMessage);
      }
    };

    signal.addEventListener("abort", () => {
      browser.runtime.onMessage.removeListener(onMessage);
      resolve(true);
    });

    browser.runtime.onMessage.addListener(onMessage);
  });
}

/**
 * Ensures that the contentScript is available on the specified page
 * @param target the tab frame to inject the contentScript into
 * @param file the contentScript file
 * @return true if the content script was injected
 */
export async function ensureContentScript(target: Target): Promise<void> {
  if (!isBackgroundPage()) {
    throw new Error(
      "ensureContentScript can only be called from the background page"
    );
  }

  console.debug(
    `Content script was requested for frame ${target.frameId} in tab ${target.tabId}`
  );

  const controller = new AbortController();

  // Start waiting for the notification as early as possible,
  // `webext-dynamic-content-scripts` might have already injected the content script
  const readyNotificationPromise = onReadyNotification(controller.signal);

  const result = await Promise.race([
    readyNotificationPromise,
    getTargetState(target),
  ]);

  if (result === true) {
    // We got the notification while waiting for the script to run, how lucky!
    console.debug(`Content script messaged us back while waiting`, target);
    return;
  }

  const state = result;
  if (!state) {
    controller.abort();
    throw new Error(
      `No access to frame ${target.frameId} in tab ${target.tabId}`
    );
  }

  if (state.ready) {
    console.debug(`Content script already exists and is ready`, target);
    controller.abort();
    return;
  }

  if (state.installed || (await isContentScriptRegistered(state.url))) {
    console.debug(
      `Content script already exists or will be injected automatically`,
      target
    );
  } else {
    console.debug(`Injecting content script`, target);
    await browser.tabs.executeScript(target.tabId, {
      frameId: target.frameId ?? 0,
      allFrames: false,
      file: "contentScript.js",
      runAt: "document_end",
    });
  }

  await readyNotificationPromise;
}
