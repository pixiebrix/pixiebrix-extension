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

export function errorMessage(error: SerializedError): string {
  return typeof error === "object" ? error.message : String(error);
}

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
 * @param error the error object
 * @param context optional context for error telemetry
 */
export function reportError(error: unknown, context?: MessageContext): void {
  try {
    if (isExtensionContext()) {
      if (!isBackgroundPage()) {
        // Log the error in the context it occurred in, so the developer doesn't have to open the
        // background page to see the error
        console.error("An error occurred", { error });
      }
      // Add catch, otherwise causes infinite loop on unhandledrejection when messaging the background script
      recordError(selectError(error), context, null).catch((error_) => {
        console.error("Another error occurred while reporting an error", {
          originalError: error,
          error: error_,
        });
      });
    } else {
      rollbar.error(toLogArgument(error));
    }
  } catch (error_) {
    console.error("An error occurred when reporting an error", {
      originalError: error,
      error: error_,
    });
  }
}
