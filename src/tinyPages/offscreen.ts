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

import type { MessageContext } from "@/types/loggerTypes";
import { type TelemetryUser } from "@/telemetry/telemetryTypes";
import { type SemVerString } from "@/types/registryTypes";
import { type SerializedError } from "@/types/messengerTypes";
import { deserializeError } from "serialize-error";
import { getErrorMessage } from "@/errors/errorHelpers";

let createOffscreenDocumentPromise: Promise<void> | null = null;

// Use optional chaining in case the chrome runtime is not available:
// https://github.com/pixiebrix/pixiebrix-extension/issues/8397
chrome.runtime?.onMessage?.addListener(handleMessages);

export type RecordErrorMessage = {
  target: "offscreen-doc";
  type: "record-error";
  data: {
    error: SerializedError;
    errorMessage: string;
    errorReporterInitInfo: {
      versionName: string;
      telemetryUser: TelemetryUser;
    };
    messageContext: MessageContext &
      UnknownObject & { extensionVersion: SemVerString };
  };
};

// Creates an offscreen document at a fixed url, if one does not already exist. Note that only one offscreen document
// can be active at a time per extension, so it's unlikely that you'll want to introduce additional html documents for
// that purpose.
export async function setupOffscreenDocument() {
  /*
   * WARNING: The runtime.getContexts() api is crashing the browser under
   *  certain conditions in chrome versions >127.0.0.0. See issue
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
   *
   * Currently, PixieBrix only uses an offscreen document in this one place,
   * to support DataDog error reporting. So, the safest thing right now is to
   * wrap the createDocument() in a try-catch and look for the error text to
   * match "Only a single offscreen document may be created" to detect when
   * the offscreen document has already been created.
   */

  if (createOffscreenDocumentPromise == null) {
    try {
      console.debug("Creating the offscreen document");
      createOffscreenDocumentPromise = chrome.offscreen.createDocument({
        url: "offscreen.html",
        // Our reason for creating an offscreen document does not fit nicely into options offered by the Chrome API, which
        // is error telemetry as of 1.8.13 (we use this as a workaround for Datadog SDK service worker limitations).
        // We chose BLOBS because it's the closest to interaction with error objects.
        // See https://developer.chrome.com/docs/extensions/reference/api/offscreen#reasons
        reasons: [chrome.offscreen.Reason.BLOBS],
        justification:
          "Error telemetry SDK usage that is incompatible with service workers",
      });
      await createOffscreenDocumentPromise;
    } catch (error) {
      createOffscreenDocumentPromise = null;

      const errorMessage = getErrorMessage(error);
      if (
        errorMessage.includes("Only a single offscreen document may be created")
      ) {
        // The offscreen document has already been created
        console.debug("Offscreen document already exists");
        return;
      }

      throw new Error(
        "Error occurred while creating the offscreen document used for error reporting",
        {
          cause: error,
        },
      );
    }

    createOffscreenDocumentPromise = null;
    console.debug("Offscreen document created successfully");
  } else {
    console.debug(
      "Offscreen document creation in progress from a previous call",
    );
    await createOffscreenDocumentPromise;
  }
}

function isRecordErrorMessage(message: unknown): message is RecordErrorMessage {
  if (typeof message !== "object" || message == null) {
    return false;
  }

  return (
    "target" in message &&
    message.target === "offscreen-doc" &&
    "type" in message &&
    message.type === "record-error"
  );
}

export const sendErrorViaErrorReporter = async (
  data: RecordErrorMessage["data"],
) => {
  const { error, errorMessage, errorReporterInitInfo, messageContext } = data;

  // WARNING: the prototype chain is lost during deserialization, so make sure any predicates you call here
  // to determine log level also handle serialized/deserialized errors.
  // See https://github.com/sindresorhus/serialize-error/issues/48

  const { getErrorReporter } = await import(
    /* webpackChunkName: "errorReporter" */
    "@/telemetry/initErrorReporter"
  );

  const { versionName, telemetryUser } = errorReporterInitInfo;
  const reporter = await getErrorReporter(versionName, telemetryUser);

  if (!reporter) {
    // Error reporter not initialized
    return;
  }

  reporter.error({
    message: errorMessage,
    error: deserializeError(error),
    messageContext,
  });
};

async function handleMessages(message: unknown) {
  if (!isRecordErrorMessage(message)) {
    return;
  }

  await sendErrorViaErrorReporter(message.data);
}
