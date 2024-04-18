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

chrome.runtime.onMessage.addListener(handleMessages);

export type RecordErrorMessage = {
  target: "offscreen-doc";
  type: "record-error";
  data: {
    error: Error;
    errorMessage: string;
    versionName: string;
    telemetryUser: TelemetryUser;
    messageContext: MessageContext &
      UnknownObject & { extensionVersion: SemVerString };
  };
};

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

  const { error, errorMessage, versionName, telemetryUser, messageContext } =
    message.data;

  // TODO: remove this comment?
  // WARNING: the prototype chain is lost during deserialization, so make sure any predicates you call here
  // to determine log level also handle serialized/deserialized errors.
  // See https://github.com/sindresorhus/serialize-error/issues/48

  const { getErrorReporter } = await import(
    /* webpackChunkName: "errorReporter" */
    "@/telemetry/initErrorReporter"
  );

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
