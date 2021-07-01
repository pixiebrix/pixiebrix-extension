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

import pDefer from "p-defer";
import { isBackgroundPage } from "webext-detect-page";
import { browser } from "webextension-polyfill-ts";
import { getAdditionalPermissions } from "webext-additional-permissions";
import { patternToRegex } from "webext-patterns";
import { ENSURE_CONTENT_SCRIPT_READY } from "@/messaging/constants";
import { isRemoteProcedureCallRequest } from "@/messaging/protocol";

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

/** Fetches the URL from a tab/frame. It will throw if we don't have permission to access it */
export async function getTargetState(target: Target): Promise<TargetState> {
  if (!isBackgroundPage()) {
    throw new Error(
      "getTargetState can only be called from the background page"
    );
  }

  const [state] = await browser.tabs.executeScript(target.tabId, {
    // This imitates the new chrome.scripting API by wrapping a function in a IIFE
    code: `(${() => ({
      url: location.href,
      installed: Symbol.for("pixiebrix-content-script") in window,
      ready: Symbol.for("pixiebrix-content-script-ready") in window,
    })})()`,
    frameId: target.frameId,
  });
  return state;
}

export async function onReadyNotification(signal: AbortSignal): Promise<void> {
  const { resolve, promise: readyNotification } = pDefer();

  const onMessage = (message: unknown) => {
    if (
      isRemoteProcedureCallRequest(message) &&
      message.type === ENSURE_CONTENT_SCRIPT_READY
    ) {
      resolve();
    }
  };

  browser.runtime.onMessage.addListener(onMessage);
  signal.addEventListener("abort", resolve);

  await readyNotification;

  browser.runtime.onMessage.removeListener(onMessage);
  signal.removeEventListener("abort", resolve);
}

/** Ensures that the contentScript is available on the specified page */
export async function ensureContentScript(target: Target): Promise<void> {
  if (!isBackgroundPage()) {
    throw new Error(
      "ensureContentScript can only be called from the background page"
    );
  }

  console.debug(`ensureContentScript: requested`, target);

  const controller = new AbortController();

  // Start waiting for the notification as early as possible,
  // `webext-dynamic-content-scripts` might have already injected the content script
  const readyNotificationPromise = onReadyNotification(controller.signal);

  try {
    const result = await Promise.race([
      readyNotificationPromise,
      getTargetState(target), // It will throw if we don't have permissions
    ]);

    if (!result) {
      console.debug(
        `ensureContentScript: script messaged us back while waiting`,
        target
      );
      return;
    }

    if (result.ready) {
      console.debug(`ensureContentScript: already exists and is ready`, target);
      return;
    }

    if (result.installed || (await isContentScriptRegistered(result.url))) {
      console.debug(
        `ensureContentScript: already exists or will be injected automatically`,
        target
      );
    } else {
      console.debug(`ensureContentScript: injecting`, target);
      await browser.tabs.executeScript(target.tabId, {
        frameId: target.frameId ?? 0,
        allFrames: false,
        file: "contentScript.js",
        runAt: "document_end",
      });
    }

    await readyNotificationPromise;
  } finally {
    console.debug(`ensureContentScript: ready`, target);
    controller.abort();
  }
}
