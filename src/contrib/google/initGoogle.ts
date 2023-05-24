/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { isChrome } from "webext-detect-page";
import pMemoize from "p-memoize";
import injectScriptTag from "@/utils/injectScriptTag";
import { isMV3 } from "@/mv3/api";
import { DISCOVERY_DOCS as SHEETS_DOCS } from "@/contrib/google/sheets/sheetsConstants";

const API_KEY = process.env.GOOGLE_API_KEY;

let initialized = false;

type Listener = () => void;
const listeners = new Set<Listener>();

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
      discoveryDocs: [...SHEETS_DOCS],
    });

    if (!globalThis.gapi) {
      throw new Error("gapi global variable was not set by gapi.client.init");
    }

    initialized = true;
    console.info("gapi initialized");

    for (const listener of listeners) {
      listener();
    }
  } catch (error) {
    // Catch explicitly instead of letting it reach to top-level rejected promise handler
    // https://github.com/google/google-api-javascript-client/issues/64#issuecomment-336488275
    reportError(error);
  }
}

/**
 * Return true if GAPI is supported by the browser.
 */
export function isGoogleSupported(): boolean {
  // TODO: Use feature detection instead of sniffing the user agent
  return isChrome() && !isMV3();
}

async function _initGoogle(): Promise<boolean> {
  if (!isGoogleSupported()) {
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

/**
 * Return true if the Google API has been initialized.
 */
export function isGoogleInitialized(): boolean {
  return initialized;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

// `pMemoize` will avoid multiple injections, while also allow retrying if the first injection fails
const initGoogle = pMemoize(_initGoogle);
export default initGoogle;
