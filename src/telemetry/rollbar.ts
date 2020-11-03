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

export function initRollbar(): void {
  if (
    process.env.ROLLBAR_ACCESS_TOKEN &&
    process.env.ROLLBAR_ACCESS_TOKEN !== "undefined"
  ) {
    Rollbar.init({
      accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
      captureUncaught: true,
      captureUnhandledRejections: true,
      payload: {
        environment: process.env.NODE_ENV,
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
              // Be sure that the minified_url when uploading includes the ROLLBAR_PUBLIC_HOST
              trace.frames[
                i
              ].filename = `${m[1]}://${process.env.ROLLBAR_PUBLIC_HOST}/${m[3]}`;
            }
          }
        }
      },
    });
  } else {
    console.debug("Rollbar not configured");
  }
}
