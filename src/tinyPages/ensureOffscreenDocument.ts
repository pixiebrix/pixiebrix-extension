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

import type { SetRequired } from "type-fest";

// Only one offscreen document can be active at a time, so it's unlikely that you'll want to create an
// additional html document for that purpose.
const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

// Manually manage promise vs. using pMemoize to support re-adding the offscreen document has closed
let createOffscreenDocumentPromise: Promise<void> | null = null;

/**
 * Helper function to get the offscreen document context if it exists. Does not create a new offscreen document.
 * @see ensureOffscreenDocument
 */
export async function getOffscreenDocument(): Promise<
  SetRequired<chrome.runtime.ExtensionContext, "documentUrl"> | undefined
> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
  });

  // Only one OFFSCREEN_DOCUMENT context can exist at a time
  // documentUrl must exist because we queried for it
  return existingContexts[0] as SetRequired<
    chrome.runtime.ExtensionContext,
    "documentUrl"
  >;
}

/**
 * Returns the tab id for which the offscreen document is recording audio, or null if not recording.
 */
export async function getRecordingTab(): Promise<number | null> {
  const offscreenDocument = await getOffscreenDocument();

  if (!offscreenDocument) {
    return null;
  }

  const offscreenUrl = new URL(offscreenDocument.documentUrl);
  const regex = /recording-(?<tabId>\d+)/;
  const tabId = regex.exec(offscreenUrl.hash)?.groups?.tabId;
  return tabId ? Number.parseInt(tabId, 10) : null;
}

/**
 * Creates an offscreen document at a fixed url, if one does not already exist. Note that only one offscreen document
 * can be active at a time per extension, so it's unlikely that you'll want to introduce additional html documents for
 * that purpose.
 */
async function ensureOffscreenDocument(): Promise<void> {
  if (await getOffscreenDocument()) {
    return;
  }

  if (createOffscreenDocumentPromise == null) {
    createOffscreenDocumentPromise = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      // Using the offscreen document for Datadog SDK service work limitations does not fit nicely into options offered
      // by the Chrome API. We chose BLOBS because it's the closest to interaction with error objects.
      // See https://developer.chrome.com/docs/extensions/reference/api/offscreen#reasons
      reasons: [
        chrome.offscreen.Reason.BLOBS,
        chrome.offscreen.Reason.USER_MEDIA,
      ],
      justification:
        "Error telemetry SDK usage that is incompatible with service workers and audio capture support",
    });
    await createOffscreenDocumentPromise;
    createOffscreenDocumentPromise = null;
  } else {
    await createOffscreenDocumentPromise;
  }
}

export default ensureOffscreenDocument;
