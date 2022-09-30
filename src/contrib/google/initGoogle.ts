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
import pMemoize from "p-memoize";
import injectScriptTag from "@/utils/injectScriptTag";

declare global {
  interface Window {
    onGAPILoad?: () => Promise<void>;
  }
}

// https://bumbu.me/gapi-in-chrome-extension
async function onGAPILoad(): Promise<void> {
  try {
    await gapi.client.init({
      // Don't pass client nor scope as these will init auth2, which we don't want
      // until the user actually uses a brick
      apiKey: API_KEY,
      discoveryDocs: [...BIGQUERY_DOCS, ...SHEETS_DOCS],
    });
    console.info("gapi initialized");
  } catch (error) {
    // Catch explicitly instead of letting it reach to top-level rejected promise handler
    // https://github.com/google/google-api-javascript-client/issues/64#issuecomment-336488275
    reportError(error);
  }
}

async function _initGoogle(): Promise<boolean> {
  if (!isChrome() || browser.runtime.getManifest().manifest_version === 3) {
    // TODO: Use feature detection instead of sniffing the user agent
    console.info(
      "Google API not enabled because it's not supported by this browser"
    );
    return false;
  }

  if (!API_KEY) {
    console.info("Google API not enabled because the API key is not available");
    return false;
  }

  window.onGAPILoad = onGAPILoad;

  await injectScriptTag(
    "https://apis.google.com/js/client.js?onload=onGAPILoad"
  );

  return true;
}

// `pMemoize` will avoid multiple injections, while also allow retrying if the first injection fails
const initGoogle = pMemoize(_initGoogle);
export default initGoogle;
