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

import { expectContext } from "@/utils/expectContext";
import { once } from "lodash";
import {
  CONTEXT_INVALIDATED_ERROR,
  getErrorMessage,
  getRootCause,
} from "./errorHelpers";

const id = "connection-lost";

/**
 * Display a notification when the background page unloads/reloads because at this point
 * all communcation becomes impossible.
 */
export async function notifyContextInvalidated(): Promise<void> {
  // `import()` is only needed to avoid execution of its dependencies, not to lazy-load it
  // https://github.com/pixiebrix/pixiebrix-extension/issues/4058#issuecomment-1217391772
  // eslint-disable-next-line import/dynamic-import-chunkname
  const { notify } = await import(/* webpackMode: "eager" */ "@/utils/notify");
  notify.error({
    id,
    message: "PixieBrix was updated or restarted. Reload the page to continue",
    reportError: false, // It cannot report it because its background page no longer exists
    duration: Number.POSITIVE_INFINITY,
  });
}

/** Detects whether an error is a fatal context invalidation */
export function isContextInvalidatedError(possibleError: unknown): boolean {
  // Do not use `wasContextInvalidated` in here because this function must return `true`
  // only if the specific error was an invalidation error.
  return (
    getErrorMessage(getRootCause(possibleError)) === CONTEXT_INVALIDATED_ERROR
  );
}

export const wasContextInvalidated = () => !chrome.runtime?.id;

/**
 * Returns a promise that resolves when the background script is unloaded,
 * which can only happens once per script lifetime.
 */
export const onContextInvalidated = once(async (): Promise<void> => {
  expectContext("extension");

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (wasContextInvalidated()) {
        resolve();
        clearInterval(interval);
      }
    }, 200);
  });
});
