/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { getErrorMessage } from "@/errors/errorHelpers";
import { getMethod } from "webext-messenger";
import { type AsyncFunction } from "type-fest/source/async-return-type";

// Only one offscreen document can be active at a time. We use offscreen documents for error telemetry, so we won't
// be able to use different documents for different purposes because the error telemetry document needs to be active.
const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

// Manually manage promise vs. using pMemoize to support re-adding if the offscreen document has closed
let createOffscreenDocumentPromise: Promise<void> | null = null;

// Defined here to avoid circular dependency with offscreen/messenger/api.ts
const pingOffscreen = getMethod("OFFSCREEN_PING", { page: "/offscreen.html" });

/**
 * Creates an offscreen document at a fixed url, if one does not already exist. Note that only one offscreen document
 * can be active at a time per extension, so it's unlikely that you'll want to introduce additional html documents for
 * that purpose.
 */
async function ensureOffscreenDocument(): Promise<void> {
  /*
   * WARNING: The runtime.getContexts() api is crashing the browser under
   *  certain conditions in chrome versions >127.0.6533.73. See issue
   *  tracker here: https://issues.chromium.org/issues/355625882
   *
   * Dangerous code to check if the offscreen document exists:

   const existingContexts = await chrome.runtime.getContexts({
     contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
     documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
   });

   if (existingContexts.length > 0) {
     return;
   }

   *
   * Also, there is currently a function present in the chrome.offscreen api
   * called hasDocument. This function is not documented in the chrome docs:
   *   https://developer.chrome.com/docs/extensions/reference/api/offscreen#method
   * Apparently, this function should not be treated as "stable," and may be
   * removed in the future, if/when more functionality is added to the offscreen api:
   *   https://issues.chromium.org/issues/40849649#:~:text=hasDocument()%20returns%20whether,in%20testing%20contexts.
   * Additional details in this chromium group conversation on `hasDocument`:
   *   https://groups.google.com/a/chromium.org/g/chromium-extensions/c/D5Jg2ukyvUc
   *
   * Currently, PixieBrix only uses an offscreen document in this one place,
   * to support DataDog error reporting. So, the safest thing right now is to
   * wrap the createDocument() in a try-catch and look for the error text to
   * match "Only a single offscreen document may be created" to detect when
   * the offscreen document has already been created.
   */

  if (createOffscreenDocumentPromise != null) {
    console.debug(
      "Offscreen document creation in progress from a previous call",
    );
    return createOffscreenDocumentPromise;
  }

  try {
    createOffscreenDocumentPromise = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      // Our reason for creating an offscreen document does not fit nicely into options offered by the Chrome API, which
      // is error telemetry as of 1.8.13 (we use this as a workaround for Datadog SDK service worker limitations).
      // We chose BLOBS because it's the closest to interaction with error objects.
      // See https://developer.chrome.com/docs/extensions/reference/api/offscreen#reasons
      reasons: [
        chrome.offscreen.Reason.BLOBS,
        chrome.offscreen.Reason.USER_MEDIA,
      ],
      justification:
        "Error telemetry SDK usage that is incompatible with service workers and audio capture support",
    });

    await createOffscreenDocumentPromise;
    console.debug("Offscreen document created successfully");

    // Ensures that the offscreen messenger is ready to receive messages.
    await pingOffscreen();
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    if (
      errorMessage.includes("Only a single offscreen document may be created")
    ) {
      // The offscreen document has already been created
      return;
    }

    throw new Error("Error occurred while creating the offscreen document", {
      cause: error,
    });
  } finally {
    createOffscreenDocumentPromise = null;
  }
}

export const wrapEnsureOffscreenDocument = <T extends AsyncFunction>(
  fn: T,
): T =>
  (async (...args: Parameters<T>) => {
    await ensureOffscreenDocument();
    return fn(...args);
  }) as T;
