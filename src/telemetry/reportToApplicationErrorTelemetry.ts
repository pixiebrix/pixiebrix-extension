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

import { readAuthData } from "@/auth/authStorage";
import { FeatureFlags } from "@/auth/featureFlags";
import { flagOn } from "@/auth/featureFlagStorage";
import { selectExtraContext } from "@/data/service/errorService";
import { BusinessError } from "@/errors/businessErrors";
import { hasSpecificErrorCause } from "@/errors/errorHelpers";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import { allowsTrack } from "@/telemetry/dnt";

import { mapAppUserToTelemetryUser } from "@/telemetry/telemetryHelpers";
import type { MessageContext } from "@/types/loggerTypes";
import { once } from "lodash";
import { serializeError } from "serialize-error";
import { sendErrorViaErrorReporter } from "@/offscreen/messenger/api";

const warnAboutDisabledDNT = once(() => {
  console.warn("Error telemetry is disabled because DNT is turned on");
});

const THROTTLE_AXIOS_SERVER_ERROR_STATUS_CODES = new Set([502, 503, 504]);
const THROTTLE_RATE_MS = 60_000; // 1 minute
let lastAxiosServerErrorTimestamp: number | null = null;

/**
 * Do not use this function directly. Use `reportError` instead: `import reportError from "@/telemetry/reportError"`
 * It's only exported for testing.
 */

export async function reportToApplicationErrorTelemetry(
  // Ensure it's an Error instance before passing it to Application error telemetry so Application error telemetry
  // treats it as the error.
  error: Error,
  flatContext: MessageContext,
  errorMessage: string,
): Promise<void> {
  // Business errors are now sent to the PixieBrix error service instead of the Application error service - see reportToErrorService
  if (
    hasSpecificErrorCause(error, BusinessError) ||
    (await flagOn(FeatureFlags.APPLICATION_ERROR_TELEMETRY_DISABLE_REPORT))
  ) {
    return;
  }

  // Throttle certain Axios status codes because they are redundant with our platform alerts
  if (
    isAxiosError(error) &&
    error.response?.status &&
    THROTTLE_AXIOS_SERVER_ERROR_STATUS_CODES.has(error.response.status)
  ) {
    // JS allows subtracting dates directly but TS complains, so get the date as a number in milliseconds:
    // https://github.com/microsoft/TypeScript/issues/8260
    const now = Date.now();

    if (
      lastAxiosServerErrorTimestamp &&
      now - lastAxiosServerErrorTimestamp < THROTTLE_RATE_MS
    ) {
      console.debug("Skipping remote error telemetry report due to throttling");
      return;
    }

    lastAxiosServerErrorTimestamp = now;
  }

  if (!(await allowsTrack())) {
    warnAboutDisabledDNT();
    return;
  }

  const { version_name: versionName } = chrome.runtime.getManifest();
  const [telemetryUser, extraContext] = await Promise.all([
    mapAppUserToTelemetryUser(await readAuthData()),
    selectExtraContext(error),
  ]);

  await sendErrorViaErrorReporter({
    error: serializeError(error),
    errorMessage,
    errorReporterInitInfo: {
      // It should never happen that versionName is undefined, but handle undefined just in case
      versionName: versionName ?? "",
      telemetryUser,
    },
    messageContext: {
      ...flatContext,
      ...extraContext,
    },
  });
}
