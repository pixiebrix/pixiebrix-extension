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
import notify from "@/utils/notify";
import { once } from "lodash";
import {
  CONTEXT_INVALIDATED_ERROR,
  getErrorMessage,
  getRootCause,
} from "./errorHelpers";

const id = "connection-lost";

export function notifyContextInvalidated(): void {
  notify.error({
    id,
    message: "PixieBrix was updated. Update the page to continue",
    reportError: false,
    duration: Number.POSITIVE_INFINITY,
  });
}

/** Detects whether an error is a fatal context invalidation */
export function isContextInvalidatedError(possibleError: unknown): boolean {
  return (
    getErrorMessage(getRootCause(possibleError)) === CONTEXT_INVALIDATED_ERROR
  );
}

export const wasContextInvalidated = () => !chrome.runtime?.id;

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
