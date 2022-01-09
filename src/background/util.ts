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
import browser from "webextension-polyfill";
import { executeFunction, injectContentScript } from "webext-content-scripts";
import { getAdditionalPermissions } from "webext-additional-permissions";
import { patternToRegex } from "webext-patterns";
import { ENSURE_CONTENT_SCRIPT_READY } from "@/messaging/constants";
import { isRemoteProcedureCallRequest } from "@/messaging/protocol";
import { expectContext } from "@/utils/expectContext";
import pTimeout from "p-timeout";
import type { Target } from "@/types";
import { canReceiveContentScript } from "@/utils/permissions";

/** Checks whether a URL will have the content scripts automatically injected */
export async function isContentScriptRegistered(url: string): Promise<boolean> {
  // Injected by the browser
  const manifestScriptsOrigins = browser.runtime
    .getManifest()
    .content_scripts.flatMap((script) => script.matches);

  // Injected by `webext-dynamic-content-scripts`
  const { origins } = await getAdditionalPermissions({
    strictOrigins: false,
  });

  // Do not replace the 2 calls above with `permissions.getAll` because it might also
  // include hosts that are permitted by the manifest but have no content script registered.
  return patternToRegex(...origins, ...manifestScriptsOrigins).test(url);
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
  expectContext("background");

  return executeFunction(target, () => ({
    url: location.href,
    installed: Symbol.for("pixiebrix-content-script") in window,
    ready: Symbol.for("pixiebrix-content-script-ready") in window,
  }));
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
  // clean up the listeners, but by then nothing is awaiting this promise anyway.
  browser.runtime.onMessage.addListener(onMessage);
  signal.addEventListener("abort", resolve);

  try {
    await readyNotification;
  } finally {
    browser.runtime.onMessage.removeListener(onMessage);
    signal.removeEventListener("abort", resolve);
  }
}

// TODO: Use https://github.com/sindresorhus/p-memoize/issues/20 to avoid multiple concurrent calls for every target
/**
 * Ensures that the contentScript is ready on the specified page, regardless of its status.
 * - If it's not expected to be injected automatically, it also injects it into the page.
 * - If it's been injected, it will resolve once the content script is ready.
 */
export async function ensureContentScript(target: Target): Promise<void> {
  expectContext("background");

  console.debug("ensureContentScript: requested", target);

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
        "ensureContentScript: script messaged us back while waiting",
        target
      );
      return;
    }

    if (result.ready) {
      console.debug("ensureContentScript: already exists and is ready", target);
      return;
    }

    if (!canReceiveContentScript(result.url)) {
      console.debug(
        "ensureContentScript: PixieBrix can’t run on this page",
        result.url
      );
      throw new Error("PixieBrix can’t run on this page");
    }

    if (result.installed || (await isContentScriptRegistered(result.url))) {
      console.debug(
        "ensureContentScript: already exists or will be injected automatically",
        target
      );
    } else {
      console.debug("ensureContentScript: injecting", target);
      const loadingScripts = browser.runtime
        .getManifest()
        .content_scripts.map(async (script) => {
          script.all_frames = false;
          script.run_at = "document_end";
          return injectContentScript(target, script);
        });

      await Promise.all(loadingScripts);
    }

    await pTimeout(
      readyNotificationPromise,
      4000,
      "contentScript not ready in 4s"
    );
    console.debug("ensureContentScript: ready", target);
  } finally {
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
  await browser.tabs.create({
    // The Options application uses a hash-based history, so put error param after the hash so it's found by useLocation
    // and useHistory.
    url: `options.html#/?error=${errorId}`,
    index: tabIndex == null ? undefined : tabIndex + 1,
  });
}

export async function forEachTab<
  TCallback extends (target: { tabId: number }) => void
>(callback: TCallback): Promise<void> {
  // TODO: Only include PixieBrix tabs, this will reduce the chance of errors
  for (const tab of await browser.tabs.query({})) {
    callback({ tabId: tab.id });
  }
}
