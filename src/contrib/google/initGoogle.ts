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

import pMemoize, { pMemoizeClear } from "p-memoize";
import injectScriptTag from "@/utils/injectScriptTag";
import { isMV3 } from "@/mv3/api";
import { DISCOVERY_DOCS as SHEETS_DOCS } from "@/contrib/google/sheets/sheetsConstants";
import pDefer from "p-defer";
import { isGoogleChrome } from "@/chrome";
import { sleep } from "@/utils";

const API_KEY = process.env.GOOGLE_API_KEY;

let initialized = false;

type Listener = () => void;
const listeners = new Set<Listener>();

declare global {
  interface Window {
    onGAPILoad?: () => Promise<void>;
  }
}

/**
 * Helper function to generate a GAPI onload function with an awaitable promise.
 */
function onGAPILoadFactory() {
  const deferredPromise = pDefer<void>();

  // https://bumbu.me/gapi-in-chrome-extension
  async function onGAPILoad(): Promise<void> {
    // Hacky setTimeout workaround to avoid open bug when loading the gapi script asynchronously
    // See: https://github.com/google/google-api-javascript-client/issues/399
    await sleep(1);

    try {
      await gapi.client.init({
        // Don't pass client nor scope as these will init auth2, which we don't want
        // until the user actually uses a brick
        apiKey: API_KEY,
        discoveryDocs: [...SHEETS_DOCS],
      });
    } catch (error) {
      deferredPromise.reject(
        new Error("Error initializing gapi client", { cause: error })
      );
      return;
    }

    if (!globalThis.gapi) {
      deferredPromise.reject(
        new Error("gapi global variable was not set by gapi.client.init")
      );
      return;
    }

    if (!gapi.client.sheets) {
      markGoogleInvalidated();
      deferredPromise.reject(new Error("gapi sheets module not loaded"));
    }

    initialized = true;

    // Resolve first before notifying to allow callers to proceed
    deferredPromise.resolve();

    for (const listener of listeners) {
      listener();
    }
  }

  return {
    onGAPILoad,
    promise: deferredPromise.promise,
  };
}

/**
 * Return true if GAPI is supported by the browser.
 */
export function isGAPISupported(): boolean {
  // Google Chrome dropped support for the chrome.identity API in other Chromium browsers
  // GAPI is not support in MV3 because it fetches remote code
  return isGoogleChrome() && !isMV3();
}

/**
 * Initialize the Google API.
 */
async function _initGoogle(): Promise<void> {
  if (!isGAPISupported()) {
    // Could use BusinessError here, but this error has caused confusion, so we need to ensure the error hits Rollbar
    // to facilitate customer support
    throw new Error("Google API is not supported by this browser");
  }

  if (!API_KEY) {
    throw new Error("Google API is not available");
  }

  const { onGAPILoad, promise: onloadPromise } = onGAPILoadFactory();

  // Match the name passed to onload query param
  window.onGAPILoad = onGAPILoad;
  await injectScriptTag(
    "https://apis.google.com/js/client.js?onload=onGAPILoad"
  );

  await onloadPromise;

  console.info("gapi initialized");
}

/**
 * Mark the Google API context as invalidated and notify listeners.
 */
export function markGoogleInvalidated(): void {
  initialized = false;
  pMemoizeClear(initGoogle);

  for (const listener of listeners) {
    listener();
  }
}

/**
 * Return true if the Google API has been initialized.
 */
export function isGoogleInitialized(): boolean {
  return initialized;
}

/**
 * Subscribe to changes in the Google API initialization state.
 * @param listener the listener to subscribe
 * @see isGoogleInitialized
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Initialize the Google API.
 *
 * Memoized to avoid multiple injections, while also allow retrying if the initial injection fails or the context
 * is later invalidated.
 *
 * @see markGoogleInvalidated
 */
const initGoogle = pMemoize(_initGoogle);

export default initGoogle;
