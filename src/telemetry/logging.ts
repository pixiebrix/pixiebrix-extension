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

import { recordError } from "@/background/logging";
import { rollbar, toLogArgument } from "@/telemetry/rollbar";
import { MessageContext, SerializedError } from "@/core";
import { serializeError } from "serialize-error";
import { isExtensionContext } from "@/chrome";
import { isBackgroundPage } from "webext-detect-page";

function selectError(error: unknown): SerializedError {
  if (error instanceof PromiseRejectionEvent) {
    // convert the project rejection to an error instance
    if (error.reason instanceof Error) {
      error = error.reason;
    } else if (typeof error.reason === "string") {
      error = new Error(error.reason);
    } else {
      error = new Error(error.reason?.message ?? "Uncaught error in promise");
    }
  }
  return serializeError(error);
}

/**
 * Report an error for local logs, remote telemetry, etc.
 * @param originalError the error object
 * @param context optional context for error telemetry
 */
export function reportError(
  originalError: unknown,
  context?: MessageContext
): void {
  void _reportError(originalError, context).catch((reportingError: unknown) => {
    console.error("An error occurred when reporting an error", {
      originalError,
      reportingError,
    });
  });
}

// Extracted async function to avoid turning `reportError` into an async function
// which would trigger `eslint/no-floating-promises` at every `reportError` call
async function _reportError(
  error: unknown,
  context?: MessageContext
): Promise<void> {
  if (!isExtensionContext()) {
    rollbar.error(toLogArgument(error));
    return;
  }

  if (!isBackgroundPage()) {
    // Log the error in the context it occurred in, so the developer doesn't have to open the
    // background page to see the error
    console.error("An error occurred", { error });
  }

  await recordError(selectError(error), context, null);
}
