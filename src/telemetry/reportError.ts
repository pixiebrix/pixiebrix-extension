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

import { MessageContext } from "@/core";
import { recordError } from "@/background/messenger/api";
import { serializeError } from "serialize-error";
import { selectError } from "@/errors";
import { expectContext } from "@/utils/expectContext";

expectContext(
  "extension",
  "reportError requires access background messenger API"
);

/**
 * Report an error for local logs, remote telemetry, etc.
 * @param error the error object
 * @param context optional context for error telemetry
 */
function reportError(error: unknown, context?: MessageContext): void {
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
  error: unknown, // It might also be an ErrorEvent
  context?: MessageContext
): Promise<void> {
  const errorObject = selectError(error);

  // Events are already natively logged to the console by the browser
  if (
    !(error instanceof ErrorEvent || error instanceof PromiseRejectionEvent)
  ) {
    console.error(error);
  }

  recordError(serializeError(errorObject), context, null);
}

export default reportError;
