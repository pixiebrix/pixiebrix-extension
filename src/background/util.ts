/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import pDefer from "p-defer";
import { browser } from "webextension-polyfill-ts";
import { injectContentScript } from "webext-content-scripts";
import { getAdditionalPermissions } from "webext-additional-permissions";
import { patternToRegex } from "webext-patterns";
import { ENSURE_CONTENT_SCRIPT_READY } from "@/messaging/constants";
import { isRemoteProcedureCallRequest } from "@/messaging/protocol";
import { expectBackgroundPage } from "@/utils/expectContext";
import { evaluableFunction } from "@/utils";

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

/**
 * Fetches the URL and content script state from a frame on a tab
 * @throws Error if background page doesn't have permission to access the tab
 * */
export async function getTargetState(target: Target): Promise<TargetState> {
  expectBackgroundPage();

  const [state] = await browser.tabs.executeScript(target.tabId, {
    // This imitates the new chrome.scripting API by wrapping a function in a IIFE
    code: evaluableFunction(() => ({
      url: location.href,
      installed: Symbol.for("pixiebrix-content-script") in window,
      ready: Symbol.for("pixiebrix-content-script-ready") in window,
    })),
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

  // `onReadyNotification` is not expected to throw. It resolves on `abort` simply to
  // clean up the listeners, but by then nothing is await this promise anyway.
  browser.runtime.onMessage.addListener(onMessage);
  signal.addEventListener("abort", resolve);

  try {
    await readyNotification;
  } finally {
    browser.runtime.onMessage.removeListener(onMessage);
    signal.removeEventListener("abort", resolve);
  }
}

/**
 * Ensures that the contentScript is ready on the specified page, regardless of its status.
 * - If it's not expected to be injected automatically, it also injects it into the page.
 * - If it's been injected, it will resolve once the content script is ready.
 */
export async function ensureContentScript(target: Target): Promise<void> {
  expectBackgroundPage();

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
      const loadingScripts = chrome.runtime
        .getManifest()
        .content_scripts.map(async (script) => {
          script.all_frames = false;
          script.run_at = "document_end";
          return injectContentScript(target, script);
        });

      await Promise.all(loadingScripts);
    }

    await readyNotificationPromise;
  } finally {
    console.debug(`ensureContentScript: ready`, target);
    controller.abort();
  }
}

/**
 * Open a new tab for the options page, showing an error message with the given errorId
 * @param errorId unique identifier for the error message
 * @param tabIndex index of the source tab, to determine location of new tab
 */
export async function showErrorInOptions(
  errorId: string,
  tabIndex?: number
): Promise<void> {
  const url = new URL(browser.runtime.getURL("options.html"));
  url.searchParams.set("error", errorId);
  await browser.tabs.create({
    url: url.toString(),
    index: tabIndex == null ? undefined : tabIndex + 1,
  });
}
