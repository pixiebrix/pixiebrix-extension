/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { isRemoteProcedureCallRequest } from "../utils/legacyMessengerUtils";
import { expectContext } from "../utils/expectContext";
import type { Target } from "@/types/messengerTypes";
import {
  CONTENT_SCRIPT_READY_NOTIFICATION,
  isTargetReady,
} from "../contentScript/ready";
import { type Runtime } from "webextension-polyfill";
import { oneEvent } from "webext-events";

// eslint-disable-next-line local-rules/persistBackgroundData -- Function
const debug = console.debug.bind(console, "waitForContentScript:");

async function onReadyNotification(
  target: Target,
  signal: AbortSignal,
): Promise<void> {
  await oneEvent(browser.runtime.onMessage, {
    signal,
    filter(message: unknown, sender: Runtime.MessageSender): boolean {
      if (!isRemoteProcedureCallRequest(message)) {
        return false;
      }

      return (
        message.type === CONTENT_SCRIPT_READY_NOTIFICATION &&
        target.tabId === sender.tab?.id &&
        target.frameId === sender.frameId
      );
    },
  });
}

export async function waitForContentScript(
  target: Target,
  timeoutMillis = 4000,
): Promise<void> {
  expectContext("background");

  debug("requested", target);
  const timeout = AbortSignal.timeout(timeoutMillis);
  await waitForContentScriptWithoutTimeout(target, timeout);
  if (timeout.aborted) {
    // TODO: Use TimeoutError after https://github.com/sindresorhus/p-timeout/issues/41
    throw new Error(`contentScript not ready in ${timeoutMillis}ms`);
  }

  debug("ready", target);
}

async function waitForContentScriptWithoutTimeout(
  target: Target,
  signal: AbortSignal,
): Promise<void> {
  // Start waiting for the notification as early as possible. Browser might have already injected the content script
  const readyNotificationPromise = onReadyNotification(target, signal);

  const isReady = await isTargetReady(target);
  if (!isReady) {
    // It did not immediately answer, so we just await its READY ping
    await readyNotificationPromise;
  }
}
