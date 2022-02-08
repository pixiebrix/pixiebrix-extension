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
import { IGNORED_ERRORS } from "@/errors";
import { isContentScript } from "webext-detect-page";
import { UUID } from "@/core";
import { addListener as addAuthListener, readAuthData } from "@/auth/token";
import { UserData } from "@/auth/authTypes";
import { getUID } from "@/background/telemetry";

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

void readAuthData().then(async (data) => {
  await updatePerson(data);
});

function initRollbar() {
  if (isContentScript()) {
    // The contentScript cannot not make requests directly to Rollbar because the site's CSP might not support it
    console.warn(
      "Unsupported import of Rollbar in the contentScript. Do not call Rollbar directly from the contentScript"
    );
  }

  if (accessToken) {
    console.debug("Initializing Rollbar error telemetry");
  }

  try {
    addAuthListener(updatePerson);

    return Rollbar.init({
      enabled: accessToken && accessToken !== "undefined" && !isContentScript(),
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

function selectPerson(data: Partial<UserData> & { browserId: UUID }): Person {
  const {
    user,
    browserId,
    email,
    telemetryOrganizationId,
    organizationId,
  } = data;

  const errorOrganizationId = telemetryOrganizationId ?? organizationId;

  return errorOrganizationId
    ? {
        id: user,
        email,
        organizationId: errorOrganizationId,
      }
    : {
        id: browserId,
        organizationId: null,
      };
}

async function updatePerson(data: Partial<UserData>): Promise<void> {
  if (rollbar) {
    const browserId = await getUID();
    const person = selectPerson({ ...data, browserId });
    console.debug("Setting Rollbar Person", person);
    rollbar.configure({
      payload: { person },
    });
  }
}
