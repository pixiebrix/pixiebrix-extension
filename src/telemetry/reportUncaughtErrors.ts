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
 * @file This file must be imported as early as possible in each entrypoint, once
 */

import { getErrorMessage, IGNORED_ERRORS } from "@/errors";
import { reportError } from "@/telemetry/rollbar";

function ignoreSomeErrors(
  errorEvent: ErrorEvent | PromiseRejectionEvent
): void {
  if (IGNORED_ERRORS.includes(getErrorMessage(errorEvent))) {
    errorEvent.preventDefault();
  }
}

function defaultErrorHandler(
  errorEvent: ErrorEvent | PromiseRejectionEvent
): void {
  for (const handler of uncaughtErrorHandlers) {
    handler(errorEvent);
    if (errorEvent.defaultPrevented) {
      return;
    }
  }

  reportError(errorEvent);
}

/**
 * Set of error event handlers to run before the default one.
 * They can call `event.preventDefault()` to avoid reporting the error.
 */
export const uncaughtErrorHandlers = new Set([ignoreSomeErrors]);

/*
Refactor beware: Do not add an `init` function or it will run too late.
When imported, the file will be executed immediately, whereas if it exports
an `init` function will be called after every top-level imports (and their deps)
has been executed.
*/
window.addEventListener("error", defaultErrorHandler);
window.addEventListener("unhandledrejection", defaultErrorHandler);
