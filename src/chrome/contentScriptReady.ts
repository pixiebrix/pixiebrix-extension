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

export function isInstalledInThisContext(): boolean {
  return CONTENT_SCRIPT_INJECTED_SYMBOL in globalThis;
}

export function setInstalledInThisContext(): void {
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
 * Fetches the URL and content script state from a frame on a tab
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
