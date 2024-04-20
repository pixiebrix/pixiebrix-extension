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

// import { selectExtraContext } from "@/data/service/errorService";
import type { MessageContext } from "@/types/loggerTypes";
import { type TelemetryUser } from "@/telemetry/telemetryHelpers";
import { type SemVerString } from "@/types/registryTypes";

chrome.runtime.onMessage.addListener(handleMessages);

export type RecordErrorMessage = {
  target: "offscreen-doc";
  type: "record-error";
  data: {
    error: Error;
    errorMessage: string;
    errorReporterInitInfo: {
      versionName: string;
      telemetryUser: TelemetryUser;
    };
    messageContext: MessageContext &
      UnknownObject & { extensionVersion: SemVerString };
  };
};

let creating: Promise<void> | null = null;
export async function setupOffscreenDocument(path: string) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    // @ts-expect-error -- TODO the type seems to be wrong here?
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  // @ts-expect-error -- TODO type contradicts the chrome api docs?
  if (existingContexts.length > 0) {
    return;
  }

  if (creating == null) {
    creating = chrome.offscreen.createDocument({
      url: "offscreen.html",
      // Our reason for creating an offscreen document does not fit nicely into options offered by the Chrome API, which
      // is error telemetry. Other possible options: TESTING or WORKERS. We chose BLOBS because it's the closest to
      // interaction with error objects?
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification:
        "Error telemetry SDK usage that is incompatible with service workers",
    });
    await creating;
    creating = null;
  } else {
    await creating;
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

async function handleMessages(message: unknown) {
  if (!isRecordErrorMessage(message)) {
    return;
  }

  const { error, errorMessage, errorReporterInitInfo, messageContext } =
    message.data;

  // TODO: remove this comment?
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
    error,
    messageContext,
  });

  console.log("*** error report success?");
}
