/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { recordError } from "@/background/logging";
import { rollbar, toLogArgument } from "@/telemetry/rollbar";
import { MessageContext, SerializedError } from "@/core";
import { serializeError } from "serialize-error";
import { isExtensionContext } from "@/chrome";

export function errorMessage(error: SerializedError): string {
  return typeof error === "object" ? error.message : String(error);
}

function selectError(exc: unknown): SerializedError {
  if (exc instanceof PromiseRejectionEvent) {
    // convert the project rejection to an error instance
    if (exc.reason instanceof Error) {
      exc = exc.reason;
    } else if (typeof exc.reason === "string") {
      exc = new Error(exc.reason);
    } else {
      exc = new Error(exc.reason?.message ?? "Uncaught error in promise");
    }
  }
  return serializeError(exc);
}

export function reportError(exc: unknown, context?: MessageContext): void {
  if (isExtensionContext()) {
    // Wrap in try/catch, otherwise will enter infinite loop on unhandledrejection when
    // messaging the background script
    recordError(selectError(exc), context, null).catch((error) => {
      console.error("Another error occurred while reporting an error", {
        exc: error,
      });
    });
  } else {
    rollbar.error(toLogArgument(exc));
  }
}
