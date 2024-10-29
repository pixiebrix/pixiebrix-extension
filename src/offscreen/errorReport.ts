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

import { deserializeError } from "serialize-error";
import type { SerializedError } from "@/types/messengerTypes";
import type { TelemetryUser } from "@/telemetry/telemetryTypes";
import type { MessageContext } from "@/types/loggerTypes";
import type { SemVerString } from "@/types/registryTypes";

type errorMessageData = {
  error: SerializedError;
  errorMessage: string;
  errorReporterInitInfo: {
    versionName: string;
    telemetryUser: TelemetryUser;
  };
  messageContext: MessageContext &
    UnknownObject & { extensionVersion: SemVerString };
};

export async function sendErrorViaErrorReporter(
  data: errorMessageData,
): Promise<void> {
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
}
