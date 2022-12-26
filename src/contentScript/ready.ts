/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
 * `Symbol.for(x)` maintains the same symbol until the context is invalidated, even if
 * the CS is injected multiple times. This should not happen but it's something we
 * need to account for: https://github.com/pixiebrix/pixiebrix-extension/issues/3510
 *
 * When a context is invalidated, the CS and the changes it made may remain on the page,
 * but the new background is not able to message the old CS, so the CS must be injected
 * again. This might cause issues if the previous CS keeps "touching" the page after
 * being deactivated: https://github.com/pixiebrix/pixiebrix-extension/issues/3132
 *
 * Using both a symbol and an attribute accounts for these 2 situations, to detect
 * and handle duplicate injections in the same session and across sessions:
 * - Same session (mistake in injection): ignore
 * - Context invalidated: CS must be injected again
 */

import { type UUID } from "@/core";
import { type Target } from "@/types";
import { forbidContext } from "@/utils/expectContext";
import { executeFunction } from "webext-content-scripts";

const html = globalThis.document?.documentElement;

// These two must be synched in `getTargetState`
export const CONTENT_SCRIPT_INJECTED_SYMBOL = Symbol.for(
  "content-script-injected"
);
export const CONTENT_SCRIPT_READY_ATTRIBUTE = "data-pb-ready";

/** Communicates readiness to `ensureContentScript` */
export const ENSURE_CONTENT_SCRIPT_READY =
  "@@pixiebrix/script/ENSURE_CONTENT_SCRIPT_READY";

declare global {
  interface Window {
    [CONTENT_SCRIPT_INJECTED_SYMBOL]?: true;
  }
}

interface TargetState {
  url: string;
  installed: boolean;
  ready: boolean;
}

export function isInstalledInThisSession(): boolean {
  return CONTENT_SCRIPT_INJECTED_SYMBOL in globalThis;
}

export function setInstalledInThisSession(): void {
  window[CONTENT_SCRIPT_INJECTED_SYMBOL] = true;
}

export function isReadyInThisDocument(): boolean {
  return html.hasAttribute(CONTENT_SCRIPT_READY_ATTRIBUTE);
}

export function setReadyInThisDocument(uuid: UUID): void {
  html.setAttribute(CONTENT_SCRIPT_READY_ATTRIBUTE, uuid);
}

/** Only removes the attribute if the `uuid` matches. This avoids race conditions with the new content script */
export function unsetReadyInThisDocument(uuid: UUID): void {
  if (uuid === html.getAttribute(CONTENT_SCRIPT_READY_ATTRIBUTE)) {
    html.removeAttribute(CONTENT_SCRIPT_READY_ATTRIBUTE);
  }
}

/**
 * Fetches the URL and content script state from tab/frame
 * @throws Error if background page doesn't have permission to access the tab
 */
export async function getTargetState(target: Target): Promise<TargetState> {
  forbidContext(
    "web",
    "chrome.tabs is only available in chrome-extension:// pages"
  );

  return executeFunction(target, () => {
    // This function does not have access to globals, the outside scope, nor `import()`
    // These two symbols must be repeated inline
    const CONTENT_SCRIPT_INJECTED_SYMBOL = Symbol.for(
      "content-script-injected"
    );
    const CONTENT_SCRIPT_READY_ATTRIBUTE = "data-pb-ready";
    return {
      url: location.href,
      installed: CONTENT_SCRIPT_INJECTED_SYMBOL in globalThis,
      ready: document.documentElement.hasAttribute(
        CONTENT_SCRIPT_READY_ATTRIBUTE
      ),
    };
  });
}
