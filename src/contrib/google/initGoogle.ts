/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

const API_KEY = process.env.GOOGLE_API_KEY;
const CHROME = process.env.CHROME;

import { DISCOVERY_DOCS as SHEETS_DOCS } from "./sheets/handlers";
import { DISCOVERY_DOCS as BIGQUERY_DOCS } from "./bigquery/handlers";

declare global {
  interface Window {
    onGAPILoad?: () => void;
  }
}

function initGoogle(): void {
  if (!CHROME) {
    console.info("gapi only available in Chrome");
    return;
  } else if (!API_KEY || API_KEY === "undefined") {
    throw new Error("Google API_KEY not set");
  }

  // https://bumbu.me/gapi-in-chrome-extension
  function onGAPILoad() {
    gapi.client
      .init({
        // Don't pass client nor scope as these will init auth2, which we don't want
        // until the user actually uses a brick
        apiKey: API_KEY,
        discoveryDocs: [...BIGQUERY_DOCS, ...SHEETS_DOCS],
      })
      .then(
        () => {
          console.log("gapi initialized");
        },
        (error) => {
          console.error("Error initializing gapi", error);
        }
      );
  }

  window.onGAPILoad = onGAPILoad;
}

export default initGoogle;
