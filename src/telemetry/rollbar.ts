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

import Rollbar from "rollbar";
import { IGNORED_ERRORS, selectError } from "@/errors";
import { isContentScript } from "webext-detect-page";
import { MessageContext } from "@/core";
import { recordError } from "@/background/messenger/api";
import { serializeError } from "serialize-error";
import { addListener as addAuthListener } from "@/auth/token";
import { BrowserAuthData } from "@/auth/authTypes";

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
 * The PixieBrix Person model for Rollbar.
 */
type Person = {
  id: string;
  organizationId: string;
  email?: string;
};

/**
 *  @see https://docs.rollbar.com/docs/javascript
 *  @see https://docs.rollbar.com/docs/rollbarjs-configuration-reference
 */
export const rollbar = initRollbar();

function initRollbar() {
  if (isContentScript()) {
    // The contentScript should not make requests directly to rollbar
    console.warn(
      "Unexpected import of Rollbar in the contentScript. Do not call Rollbar directly from the contentScript"
    );
  }

  if (accessToken) {
    console.debug("Initializing Rollbar error telemetry");
  }

  try {
    addAuthListener(updatePerson);

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
      ignoredMessages: IGNORED_ERRORS,
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
    console.error("Error during Rollbar init", { error });
  }
}

export async function updatePerson({
  user,
  browserId,
  email,
  telemetryOrganizationId,
  organizationId,
}: BrowserAuthData): Promise<void> {
  const errorOrganizationId = telemetryOrganizationId ?? organizationId;

  const person: Person = organizationId
    ? {
        id: user,
        email,
        organizationId: errorOrganizationId,
      }
    : {
        id: browserId,
        organizationId: null,
      };

  if (rollbar) {
    rollbar.configure({
      payload: { person },
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

  // Events are already natively logged by the browser
  if (
    !(error instanceof ErrorEvent || error instanceof PromiseRejectionEvent)
  ) {
    console.error(error);
  }

  recordError(serializeError(errorObject), context, null);
}
