/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import pDefer, { type DeferredPromise } from "p-defer";
import { injectContentScript } from "webext-content-scripts";
import { isContentScriptRegistered } from "webext-dynamic-content-scripts/utils";

import { ENSURE_CONTENT_SCRIPT_READY } from "@/messaging/constants";
import { isRemoteProcedureCallRequest } from "@/messaging/protocol";
import { expectContext } from "@/utils/expectContext";
import pTimeout from "p-timeout";
import type { Target } from "@/types";
import { getTargetState } from "@/contentScript/ready";
import { memoizeUntilSettled } from "@/utils";
import { Runtime } from "webextension-polyfill";
import { possiblyActiveTabs } from "webext-dynamic-content-scripts/distribution/active-tab";

import MessageSender = Runtime.MessageSender;

const log = console.debug.bind(console, "ensureContentScript:");

/**
 * @see makeSenderKey
 * @see makeTargetKey
 */
const targetReadyPromiseMap = new Map<string, DeferredPromise<Event>>();

export function makeSenderKey(sender: MessageSender): string {
  // Be defensive: `tab?` to handle messages from other locations (so we can ignore instead of error)
  return JSON.stringify({ tabId: sender.tab?.id, frameId: sender.frameId });
}

function makeTargetKey(target: Target): string {
  return JSON.stringify({ tabId: target.tabId, frameId: target.frameId });
}

/**
 * Runtime message handler to handle ENSURE_CONTENT_SCRIPT_READY messages sent from the contentScript
 */
function onContentScriptReadyMessage(
  message: unknown,
  sender: MessageSender
): null | undefined {
  if (
    isRemoteProcedureCallRequest(message) &&
    message.type === ENSURE_CONTENT_SCRIPT_READY &&
    sender.id === browser.runtime.id
  ) {
    const key = makeSenderKey(sender);

    try {
      targetReadyPromiseMap.get(key)?.resolve();
    } catch (error) {
      console.error("Error resolving contentScript ready promise", error);
    } finally {
      targetReadyPromiseMap.delete(key);
    }

    // Don't value to indicate we handled the message
    return null;
  }

  // Don't return anything to indicate this didn't handle the message
}

export async function onReadyNotification(
  target: Target,
  signal: AbortSignal
): Promise<void> {
  // Track if this thread is created the promise, so it can be the one to delete it from the map
  let isLeader = false;
  const key = makeTargetKey(target);

  let deferredPromise = targetReadyPromiseMap.get(key);
  if (!deferredPromise) {
    isLeader = true;
    deferredPromise = pDefer<Event>();
    targetReadyPromiseMap.set(key, deferredPromise);
  }

  // `onReadyNotification` is not expected to throw. It resolves on `abort` simply to
  // clean up the listeners, but by then nothing is awaiting this promise anyway.
  signal.addEventListener("abort", deferredPromise.resolve);

  try {
    await deferredPromise.promise;
  } finally {
    signal.removeEventListener("abort", deferredPromise.resolve);
    if (isLeader) {
      // Avoid race condition where another task has created a new promise
      targetReadyPromiseMap.delete(key);
    }
  }
}

async function injectFromManifest(target: Target): Promise<void> {
  log("injecting", target);
  const scripts = browser.runtime
    .getManifest()
    .content_scripts.map((script) => {
      script.all_frames = false;
      return script;
    });

  await injectContentScript(target, scripts);
}

/**
 * Ensures that the contentScript is ready on the specified page, regardless of its status.
 * - If it's not expected to be injected automatically, it also injects it into the page.
 * - If it's been injected, it will resolve once the content script is ready.
 */
export const ensureContentScript = memoizeUntilSettled(
  async (target: Target, timeoutMillis = 4000): Promise<void> => {
    expectContext("background");

    const controller = new AbortController();
    const { signal } = controller;

    try {
      log("requested", target);

      // TODO: Simplify after https://github.com/sindresorhus/p-timeout/issues/31
      await pTimeout(ensureContentScriptWithoutTimeout(target, signal), {
        signal,
        milliseconds: timeoutMillis,
        message: `contentScript not ready in ${timeoutMillis}ms`,
      });

      log("ready", target);
    } finally {
      controller.abort();
    }
  },
  // Stringify since Target is an object
  { cacheKey: JSON.stringify }
);

async function ensureContentScriptWithoutTimeout(
  target: Target,
  signal: AbortSignal
): Promise<void> {
  // Start waiting for the notification as early as possible,
  // `webext-dynamic-content-scripts` might have already injected the content script
  const readyNotificationPromise = onReadyNotification(target, signal);

  const result = await getTargetState(target); // It will throw if we don't have permissions

  if (result.ready) {
    log("already exists and is ready", target);
    return;
  }

  if (result.installed) {
    console.debug(
      "ensureContentScript: already exists but isn't ready",
      target
    );

    await readyNotificationPromise;
    return;
  }

  const registration = await isContentScriptRegistered(result.url);
  if (registration === "static") {
    // TODO: Potentially inject anyway on pixiebrix.com https://github.com/pixiebrix/pixiebrix-extension/issues/4189
    console.debug(
      "ensureContentScript: will be injected automatically by the manifest",
      target
    );
  } else if (registration === "dynamic") {
    console.debug(
      "ensureContentScript: will be injected automatically by webext-dynamic-content-script",
      target
    );
  } else if (possiblyActiveTabs.has(target.tabId)) {
    console.debug(
      "ensureContentScript: will be injected automatically by webext-dynamic-content-script, via activeTab",
      target
    );
  } else {
    console.warn(
      "ensureContentScript: will be injected here, but will likely fail",
      target
    );
    await injectFromManifest(target);
  }

  await readyNotificationPromise;
}

export function initContentScriptReadyListener() {
  browser.runtime.onMessage.addListener(onContentScriptReadyMessage);
}
