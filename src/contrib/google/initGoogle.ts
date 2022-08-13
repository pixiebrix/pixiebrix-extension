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

import reportError from "@/telemetry/reportError";

const API_KEY = process.env.GOOGLE_API_KEY;

import { DISCOVERY_DOCS as SHEETS_DOCS } from "./sheets/handlers";
import { DISCOVERY_DOCS as BIGQUERY_DOCS } from "./bigquery/handlers";
import { isChrome } from "webext-detect-page";

declare global {
  interface Window {
    onGAPILoad?: () => Promise<void>;
    onGAPIError?: (error: unknown) => Promise<void>;
  }
}

// https://bumbu.me/gapi-in-chrome-extension
async function onGAPILoad(): Promise<void> {
  await gapi.client.init({
    // Don't pass client nor scope as these will init auth2, which we don't want
    // until the user actually uses a brick
    apiKey: API_KEY,
    discoveryDocs: [...BIGQUERY_DOCS, ...SHEETS_DOCS],
  });
  console.info("gapi initialized");
}

async function onGAPIError(error: unknown): Promise<void> {
  reportError(error);
}

function initGoogle(): void {
  if (!isChrome() || typeof document === "undefined" /* MV3 exclusion */) {
    // TODO: Use feature detection instead of sniffing the user agent
    console.info(
      "Google API not enabled because it's not supported by this browser"
    );
    return;
  }

  if (!API_KEY) {
    console.info("Google API not enabled because the API key is not available");
    return;
  }

  window.onGAPILoad = onGAPILoad;
  window.onGAPIError = onGAPIError;

  const script = document.createElement("script");
  script.src =
    "https://apis.google.com/js/client.js?onload=onGAPILoad&onerror=onGAPIError";
  script.addEventListener("error", (event) => {
    reportError(event.error);
  });
  document.head.append(script);
}

export default initGoogle;
