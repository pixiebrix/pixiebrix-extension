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

import Rollbar, { LogArgument } from "rollbar";
import { getErrorMessage, ignoredErrors, selectError } from "@/errors";
import { isExtensionContext } from "webext-detect-page";
import { MessageContext } from "@/core";
import { recordError } from "@/background/messenger/api";
import { serializeError } from "serialize-error";

const accessToken = process.env.ROLLBAR_BROWSER_ACCESS_TOKEN;

type Frame = {
  filename: string;
};

type Payload = {
  body: {
    trace: {
      frames: Frame[];
    };
  };
};

/**
 *  @see https://docs.rollbar.com/docs/javascript
 *  @see https://docs.rollbar.com/docs/rollbarjs-configuration-reference
 */
export const rollbar = initRollbar();

function initRollbar() {
  try {
    return Rollbar.init({
      enabled: accessToken && accessToken !== "undefined",
      accessToken,
      captureUncaught: true,
      captureIp: "anonymize",
      captureUnhandledRejections: true,
      codeVersion: process.env.SOURCE_VERSION,
      // https://docs.rollbar.com/docs/rollbarjs-telemetry
      // disable autoInstrument until we can set up scrubbing rules
      autoInstrument: false,
      // https://docs.rollbar.com/docs/reduce-noisy-javascript-errors#ignore-certain-types-of-messages
      ignoredMessages: ignoredErrors,
      payload: {
        client: {
          javascript: {
            code_version: process.env.SOURCE_VERSION,
            source_map_enabled: true,
          },
        },
        environment: process.env.ENVIRONMENT,
      },
      transform: (payload: Payload) => {
        // Standardize the origin across browsers so that they match the source map we uploaded to rollbar
        // https://docs.rollbar.com/docs/source-maps#section-using-source-maps-on-many-domains
        for (const frame of payload.body.trace?.frames ?? []) {
          if (frame.filename && !frame.filename.startsWith("http")) {
            frame.filename = frame.filename.replace(
              location.origin,
              process.env.ROLLBAR_PUBLIC_PATH
            );
          }
        }
      },
    });
  } catch (error) {
    console.error("Error during rollbar init", { error });
  }
}

/**
 * Convert a message or value into a rollbar logging argument.
 *
 * Convert functions/callbacks to `undefined` so they're ignored by rollbar.
 *
 * @see https://docs.rollbar.com/docs/rollbarjs-configuration-reference#rollbarlog
 */
export function toLogArgument(error: unknown): LogArgument {
  if (typeof error === "function") {
    // The function argument for rollbar.log is a callback to call once the error has been reported, drop
    // these prevent accidentally calling the callback
    return undefined;
  }

  if (typeof error === "object") {
    // The custom data or error object
    return error;
  }

  return getErrorMessage(error);
}

export async function updateAuth({
  userId,
  email,
  organizationId,
  browserId,
}: {
  userId: string;
  organizationId: string | null;
  email: string | null;
  browserId: string | null;
}): Promise<void> {
  if (!rollbar) {
    return;
  }

  if (isExtensionContext()) {
    if (organizationId) {
      // Enterprise accounts, use userId for telemetry
      rollbar.configure({
        payload: { person: { id: userId, email, organizationId } },
      });
    } else {
      rollbar.configure({
        payload: { person: { id: browserId, organizationId: null } },
      });
    }
  } else {
    rollbar.configure({
      payload: { person: { id: userId, organizationId } },
    });
  }
}

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
  error: unknown, // It might also be an ErrorEvent
  context?: MessageContext
): Promise<void> {
  const errorObject = selectError(error);
  if (!isExtensionContext()) {
    // This module is also used by the PixieBrix app, so allow this method to be called from an external context
    rollbar.error(toLogArgument(errorObject));
    return;
  }

  // Events are already natively logged
  if (
    !(error instanceof ErrorEvent || error instanceof PromiseRejectionEvent)
  ) {
    console.error(error);
  }

  recordError(serializeError(errorObject), context, null);
}
