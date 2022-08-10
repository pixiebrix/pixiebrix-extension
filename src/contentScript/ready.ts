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
 * and handle duplicate injections in the same session and across sessions.
 */

import { UUID } from "@/core";
import { Target } from "@/types";
import { expectContext } from "@/utils/expectContext";
import { executeFunction } from "webext-content-scripts";

// These two must be synched in `getTargetState`
export const CONTENT_SCRIPT_INJECTED_SYMBOL = Symbol.for(
  "content-script-injected"
);
export const CONTENT_SCRIPT_READY_ATTRIBUTE = "data-pb-ready";

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
  return document.documentElement.hasAttribute(CONTENT_SCRIPT_READY_ATTRIBUTE);
}

export function setReadyInThisDocument(uuid: UUID | false): void {
  if (uuid) {
    document.documentElement.setAttribute(CONTENT_SCRIPT_READY_ATTRIBUTE, uuid);
  } else {
    document.documentElement.removeAttribute(CONTENT_SCRIPT_READY_ATTRIBUTE);
  }
}

/**
 * Fetches the URL and content script state from tab/frame
 * @throws Error if background page doesn't have permission to access the tab
 * */
export async function getTargetState(target: Target): Promise<TargetState> {
  expectContext("background");

  return executeFunction(target, () => {
    // Thise two must also be inlined here because `executeFunction` does not include non-local variables
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
