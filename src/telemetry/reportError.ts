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
import { getContextName } from "webext-detect-page";

expectContext(
  "extension",
  "reportError requires access background messenger API"
);

/**
 * Report an error for local logs, remote telemetry, etc.
 * @param error the error object
 * @param context optional context for error telemetry
 */
function reportError(
  error: unknown, // It might also be an ErrorEvent
  context?: MessageContext,
  { logToConsole = true } = {}
): void {
  if (logToConsole) {
    console.error(error);
  }

  try {
    recordError(serializeError(selectError(error)), {
      ...context,
      // Add on the reporter side of the message. On the receiving side it would always be `background`
      pageName: getContextName(),
    });
  } catch (reportingError) {
    // The messenger does not throw async errors on "notifiers" but if this is
    // called in the background the call will be executed directly and it could
    // theoretically throw a synchronous error
    console.error("An error occurred when reporting an error", {
      originalError: error,
      reportingError,
    });
  }
}

export default reportError;
