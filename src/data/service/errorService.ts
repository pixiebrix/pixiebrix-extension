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

import { debounce } from "lodash";
import { maybeGetLinkedApiClient } from "@/data/service/apiClient";
import {
  hasSpecificErrorCause,
  selectSpecificError,
} from "@/errors/errorHelpers";
import { allowsTrack } from "@/telemetry/dnt";
import { uuidv4 } from "@/types/helpers";
import { getUserData } from "@/auth/authStorage";
import {
  isAppRequestError,
  selectAxiosError,
} from "@/data/service/requestErrorUtils";
import { type ErrorItem } from "@/types/contract";
import { expectContext } from "@/utils/expectContext";
import {
  BusinessError,
  CancelError,
  RequestSupersededError,
} from "@/errors/businessErrors";
import { type SerializedError } from "@/types/messengerTypes";
import { type SemVerString } from "@/types/registryTypes";
import { type MessageContext } from "@/types/loggerTypes";
import { isObject } from "@/utils/objectUtils";
import { flagOn } from "@/auth/featureFlagStorage";
import { selectAbsoluteUrl } from "@/utils/urlUtils";
import { getExtensionVersion } from "@/utils/extensionUtils";
import { nowTimestamp } from "@/utils/timeUtils";
import { FeatureFlags } from "@/auth/featureFlags";

const EVENT_BUFFER_DEBOUNCE_MS = 2000;
const EVENT_BUFFER_MAX_MS = 10_000;

// eslint-disable-next-line local-rules/persistBackgroundData -- Short-lived
const buffer: ErrorItem[] = [];

const debouncedFlush = debounce(flush, EVENT_BUFFER_DEBOUNCE_MS, {
  trailing: true,
  leading: false,
  maxWait: EVENT_BUFFER_MAX_MS,
});

async function flush(): Promise<void> {
  if (buffer.length > 0) {
    const client = await maybeGetLinkedApiClient();
    if (client) {
      const events = buffer.splice(0, buffer.length);
      // Pass as list, the request payload is not in an envelope
      await client.post("/api/telemetry/errors/", events);
    }
  }
}

/**
 * Select extra error context for:
 * - Extension version, so we don't have to maintain a separate mapping of commit SHAs to versions for reporting
 * - Requests to PixieBrix API to detect network problems client side
 * - Any service request if enterprise has enabled `enterprise-telemetry`
 */
export async function selectExtraContext(
  error: Error | SerializedError,
): Promise<UnknownObject & { extensionVersion: SemVerString }> {
  const { manifest_version: manifestVersion } = browser.runtime.getManifest();
  const extensionVersion = getExtensionVersion();
  const extraContext: UnknownObject & { extensionVersion: SemVerString } = {
    extensionVersion,
    manifestVersion,
    runtimeId: browser.runtime.id,
  };

  if (!isObject(error)) {
    return extraContext;
  }

  const axiosError = selectAxiosError(error);

  if (
    axiosError?.config &&
    ((await flagOn(FeatureFlags.ENTERPRISE_TELEMETRY)) ||
      (await isAppRequestError(axiosError)))
  ) {
    extraContext.url = selectAbsoluteUrl(axiosError.config);
  }

  const { name, stack, code, cause } = error;

  return {
    ...extraContext,
    name,
    stack,
    cause,
    code,
  };
}

/**
 * Returns true if the error should be ignored for error telemetry purposes.
 */
export function shouldIgnoreError(error: Error): boolean {
  // Cannot rely on subclassing due to serialization/deserialization across messenger boundaries
  return (
    hasSpecificErrorCause(error, CancelError) ||
    hasSpecificErrorCause(error, RequestSupersededError)
  );
}

/**
 * Report to the PixieBrix error telemetry service
 * @see reportToApplicationErrorTelemetry
 */
export async function reportToErrorService(
  error: Error,
  flatContext: MessageContext,
  message: string,
): Promise<void> {
  expectContext(
    "background",
    // The buffer/flush call is local to the background page
    "reportToErrorService should only be called from the background page",
  );

  if (await flagOn(FeatureFlags.ERROR_SERVICE_DISABLE_REPORT)) {
    return;
  }

  if (flatContext.modComponentId == null) {
    // Only report errors that occurred within a user-defined extension/blueprint. Other errors only go to Application error telemetry.
    // (They're problems with our software.)
    return;
  }

  if (shouldIgnoreError(error)) {
    return;
  }

  if (!(await allowsTrack())) {
    // We warn that tracking is disabled in the analogous call to report Application error telemetry. See reportToApplicationErrorTelemetry
    return;
  }

  const { extensionVersion, ...data } = await selectExtraContext(error);
  const { telemetryOrganizationId, organizationId } = await getUserData();

  const payload: ErrorItem = {
    uuid: uuidv4(),
    organization: telemetryOrganizationId ?? organizationId,
    class_name: error.name,
    message,
    deployment: flatContext.deploymentId,
    extension_uuid: flatContext.modComponentId,
    extension_label: flatContext.modComponentLabel,
    step_label: flatContext.label,
    user_agent: navigator.userAgent,
    user_agent_extension_version: extensionVersion,
    is_application_error: !selectSpecificError(error, BusinessError),
    error_data: data,
    timestamp: nowTimestamp(),
  };

  // For blueprint_version/service_version/brick_version the server can't handle null value. Must leave the property
  // off completely.

  if (flatContext.modId && flatContext.modVersion) {
    payload.blueprint_version = {
      id: flatContext.modId,
      version: flatContext.modVersion,
    };
  }

  if (flatContext.integrationId && flatContext.integrationVersion) {
    payload.service_version = {
      id: flatContext.integrationId,
      version: flatContext.integrationVersion,
    };
  }

  if (flatContext.brickId && flatContext.brickVersion) {
    payload.brick_version = {
      id: flatContext.brickId,
      version: flatContext.brickVersion,
    };
  }

  buffer.push(payload);

  await debouncedFlush();
}
