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

import { recordError } from "@/background/messenger/api";
import { rollbar, toLogArgument } from "@/telemetry/rollbar";
import { MessageContext } from "@/core";
import { serializeError } from "serialize-error";
import { isBackground, isExtensionContext } from "webext-detect-page";
import { selectError } from "@/errors";

/**
 * Report an error for local logs, remote telemetry, etc.
 * @param error the error object
 * @param context optional context for error telemetry
 */
export function reportError(error: unknown, context?: MessageContext): void {
  void _reportError(error, context).catch((reportingError) => {
    console.error("An error occurred when reporting an error", {
      originalError: error,
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
    // This module is also used by the PixieBrix app, so allow this method to be called from an external context
    rollbar.error(toLogArgument(selectError(error)));
    return;
  }

  if (!isBackground()) {
    // Also log the error in the context it occurred in, so the developer
    // doesn't have to open the background page to see it
    console.error(error);
  }

  recordError(serializeError(selectError(error)), context, null);
}
