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

/**
 * @file Handles the definition and state of "readiness" of the content script (CS) context.
 *
 * There's one "content script" context per extension load. All the content scripts injected
 * by the extension share this context and its symbols, even if injected repeatedly.
 *
 * When the extension is deactivated or reloaded, the content script is still kept active but it's
 * unable to communicate to the background page/worker (because that context has been invalidated).
 * In the console you can see multiple content scripts running at the same time, until you reload the tab.
 *
 * When the (background) context is invalidated, we must manually remove all of its listeners and
 * attached widgets to avoid conflicts with future content script injections:
 * https://github.com/pixiebrix/pixiebrix-extension/issues/4258
 */

import { type Target } from "@/types/messengerTypes";
import { forbidContext } from "@/utils/expectContext";
import { isRemoteProcedureCallRequest } from "@/utils/legacyMessengerUtils";

const CONTENT_SCRIPT_STATE_SYMBOL = Symbol.for("content-script-state");

/** Communicates readiness to `waitForContentScript` */
export const CONTENT_SCRIPT_READY = "LOADING/CONTENT_SCRIPT_READY";
const CONTENT_SCRIPT_RAW_PING = "LOADING/CONTENT_SCRIPT_RAW_PING";

type ContentScriptState = undefined | "installed" | "ready";

declare global {
  interface Window {
    [CONTENT_SCRIPT_STATE_SYMBOL]?: ContentScriptState;
  }
}

export function getContentScriptState(): ContentScriptState {
  return window[CONTENT_SCRIPT_STATE_SYMBOL];
}

export function setContentScriptState(newState: "installed" | "ready"): void {
  const currentState = getContentScriptState();
  if (newState === "installed") {
    if (currentState != null) {
      throw new Error(`Content script state already set to ${currentState}`);
    }
  } else if (newState === "ready") {
    if (currentState !== "installed") {
      throw new Error(
        `Content script state must be "installed" to set it to "ready", but it's ${currentState}`,
      );
    }

    // Notify `waitForContentScript` listeners, if any
    void browser.runtime.sendMessage({ type: CONTENT_SCRIPT_READY });

    // Respond to any successive `waitForContentScript` pings
    browser.runtime.onMessage.addListener(onMessage);
  }

  window[CONTENT_SCRIPT_STATE_SYMBOL] = newState;
}

// Do not use the Messenger, it cannot appear in this bundle
export async function isTargetReady(target: Target): Promise<boolean> {
  forbidContext("contentScript");
  const response = (await browser.tabs.sendMessage(
    target.tabId,
    {
      type: CONTENT_SCRIPT_RAW_PING,
    },
    { frameId: target.frameId },
  )) as true | undefined;
  return response ?? false;
}

// eslint-disable-next-line @typescript-eslint/promise-function-async -- Message handlers must return undefined to "pass through", not Promise<undefined>
function onMessage(message: unknown): Promise<true> | undefined {
  if (
    isRemoteProcedureCallRequest(message) &&
    message.type === CONTENT_SCRIPT_RAW_PING
  ) {
    // Do not return an unpromised `true` because `webextension-polyfill` handles it differently
    return Promise.resolve(true);
  }
}

// TODO: Move out of contentScript/ready.ts, it's unrelated logic
let reloadOnNextNavigate = false;

/**
 * Return true if the mods should be reloaded on the next navigation.
 */
export function getReloadOnNextNavigate(): boolean {
  return reloadOnNextNavigate;
}

/**
 * Set if the mods should be reloaded on the next navigation.
 */
export function setReloadOnNextNavigate(value: boolean): void {
  reloadOnNextNavigate = value;
}
