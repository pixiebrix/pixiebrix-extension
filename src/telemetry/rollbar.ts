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

import Rollbar from "rollbar";
import { isExtensionContext } from "@/chrome";
import { getUID } from "@/background/telemetry";

export let rollbar: Rollbar;

export async function updateAuth({
  userId,
  email,
  organizationId,
}: {
  userId: string;
  organizationId: string | null;
  email: string | null;
}): Promise<void> {
  if (rollbar) {
    if (isExtensionContext()) {
      if (organizationId) {
        // Enterprise accounts, use userId for telemetry
        rollbar.configure({
          payload: { person: { id: userId, email, organizationId } },
        });
      } else {
        rollbar.configure({
          payload: { person: { id: await getUID(), organizationId: null } },
        });
      }
    } else {
      rollbar.configure({
        payload: { person: { id: userId, organizationId: organizationId } },
      });
    }
  }
}

export function initRollbar(): void {
  if (
    process.env.ROLLBAR_BROWSER_ACCESS_TOKEN &&
    process.env.ROLLBAR_BROWSER_ACCESS_TOKEN !== "undefined"
  ) {
    // https://docs.rollbar.com/docs/javascript
    // https://docs.rollbar.com/docs/rollbarjs-configuration-reference
    rollbar = Rollbar.init({
      accessToken: process.env.ROLLBAR_BROWSER_ACCESS_TOKEN,
      captureUncaught: true,
      captureIp: "anonymize",
      captureUnhandledRejections: true,
      codeVersion: process.env.SOURCE_VERSION,
      // https://docs.rollbar.com/docs/rollbarjs-telemetry
      // disable autoInstrument until we can set up scrubbing rules
      autoInstrument: false,
      payload: {
        client: {
          javascript: {
            code_version: process.env.SOURCE_VERSION,
            source_map_enabled: true,
          },
        },
        environment: process.env.ENVIRONMENT,
      },
      transform: function (payload: Record<string, unknown>) {
        // @ts-ignore: copied this example from Rollbar's documentation, so should presumably always be available
        const trace = payload.body.trace;
        const locRegex = /^(chrome-extension|moz-extension):\/\/(.*?)\/(.*)/;
        if (trace && trace.frames) {
          for (let i = 0; i < trace.frames.length; i++) {
            const filename = trace.frames[i].filename;
            if (filename) {
              const m = filename.match(locRegex);
              // Be sure that the minified_url when uploading includes the build type
              trace.frames[
                i
              ].filename = `${m[1]}://${process.env.ENVIRONMENT}/${m[3]}`;
            }
          }
        }
      },
    });
  } else {
    console.debug("Rollbar not configured");
  }
}
