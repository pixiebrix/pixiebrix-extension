/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { type MessageContext } from "@/types/loggerTypes";
import { backgroundTarget as bg, getNotifier } from "webext-messenger";
import { serializeError } from "serialize-error";
import { selectError, shouldErrorBeIgnored } from "@/errors/errorHelpers";
import { expectContext } from "@/utils/expectContext";
import { getContextName } from "webext-detect";
import { isAxiosError } from "@/errors/networkErrorHelpers";

expectContext(
  "extension",
  "reportError requires access to the background messenger API",
);

// Private method. Do not move to api.ts
const _record = getNotifier("RECORD_ERROR", bg);

interface ErrorReportOptions {
  /** Optional context for error telemetry */
  context?: MessageContext;

  /** Additionally log error to the browser console (default=true) */
  logToConsole?: boolean;
}

export const getReportErrorAdditionalContext = () => {
  // In case of service worker.
  const documentContext =
    typeof window === "undefined"
      ? { url: "service worker", referrer: "undefined" }
      : {
          // Record original current url and referrer here before it is lost in the service worker.
          url: window.location.href,
          referrer: document.referrer,
        };

  // Casting navigator since it is missing typings
  // TODO: remove this cast when the TS lib type for navigator is updated
  //  https://github.com/microsoft/TypeScript/issues/56962
  const navigatorCast = navigator as unknown as
    | { deviceMemory?: number; connection?: { effectiveType?: string } }
    | undefined;

  const navigatorContext = {
    // Network speed. "4g", "3g", "2g", "slow-2g" https://developer.mozilla.org/en-US/docs/Glossary/Effective_connection_type
    connectionType: navigatorCast?.connection?.effectiveType || "unknown",
    // Approximate value in gigabytes. https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
    deviceMemory: navigatorCast?.deviceMemory,
  };

  return {
    // Add on the reporter side of the message. On the receiving side it would always be `background`
    pageName: getContextName(),
    ...documentContext,
    ...navigatorContext,
  };
};

/**
 * Report an error for local logs, remote telemetry, etc.
 * @param errorLike the error object, error event, or string to report. Callers should provide Error objects when
 * possible for accurate stack traces.
 * @param context Optional context for error telemetry
 * @param logToConsole Additionally log error to the browser console (default=true)
 */
export default function reportError(
  errorLike: unknown, // It might also be an ErrorEvent or string
  { context = {}, logToConsole = true }: ErrorReportOptions = {},
): void {
  if (logToConsole) {
    console.error(errorLike, { context });
  }

  if (shouldErrorBeIgnored(errorLike, context)) {
    console.debug("Ignoring error matching IGNORED_ERROR_PATTERNS", {
      error: errorLike,
    });
    return;
  }

  try {
    _record(
      serializeError(selectError(errorLike), {
        // AxiosError toJSON leaves functions intact which are not serializable, so we specifically
        // disable useToJSON for AxiosErrors. See: https://github.com/pixiebrix/pixiebrix-extension/issues/9198
        // We cannot just delete toJSON from the error since it is a prototype method and would be inherited
        useToJSON: !isAxiosError(errorLike),
      }),
      {
        ...context,
        ...getReportErrorAdditionalContext(),
      },
    );
  } catch (reportingError) {
    // The messenger does not throw async errors on "notifiers" but if this is
    // called in the background the call will be executed directly, and it could
    // theoretically throw a synchronous error
    console.error("An error occurred when reporting an error", {
      originalError: errorLike,
      reportingError,
    });
  }
}
