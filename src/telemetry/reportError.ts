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
import { backgroundTarget as bg, messenger } from "webext-messenger";
import { serializeError } from "serialize-error";
import { selectError } from "@/errors/errorHelpers";
import { expectContext } from "@/utils/expectContext";
import { getContextName } from "webext-detect-page";

expectContext(
  "extension",
  "reportError requires access background messenger API"
);

/**
 * Report an error for local logs, remote telemetry, etc.
 * @param errorLike the error object
 * @param context optional context for error telemetry
 * @param logToConsole additionally log error to the browser console (default=true)
 */
export default function reportError(
  errorLike: unknown, // It might also be an ErrorEvent
  context?: MessageContext,
  { logToConsole = true } = {}
): void {
  if (logToConsole) {
    console.error(errorLike, { context });
  }

  try {
    messenger(
      // Low-level direct API call to avoid calls outside reportError
      "RECORD_ERROR",
      { isNotification: true },
      bg,
      serializeError(selectError(errorLike)),
      {
        ...context,
        // Add on the reporter side of the message. On the receiving side it would always be `background`
        pageName: getContextName(),
      }
    );
  } catch (reportingError) {
    // The messenger does not throw async errors on "notifiers" but if this is
    // called in the background the call will be executed directly and it could
    // theoretically throw a synchronous error
    console.error("An error occurred when reporting an error", {
      originalError: errorLike,
      reportingError,
    });
  }
}
