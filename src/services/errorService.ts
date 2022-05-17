/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { JsonObject } from "type-fest";
import { debounce } from "lodash";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import { MessageContext, SemVerString, SerializedError } from "@/core";
import { hasBusinessRootCause, hasCancelRootCause } from "@/errors";
import { allowsTrack } from "@/telemetry/dnt";
import { uuidv4, validateSemVerString } from "@/types/helpers";
import { isObject } from "@/utils";
import { flagOn, getUserData } from "@/auth/token";
import {
  isAppRequest,
  selectAbsoluteUrl,
  selectAxiosError,
} from "@/services/requestErrorUtils";
import { ErrorItem } from "@/types/contract";
import { expectContext } from "@/utils/expectContext";

const EVENT_BUFFER_DEBOUNCE_MS = 2000;
const EVENT_BUFFER_MAX_MS = 10_000;

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
  error: Error | SerializedError
): Promise<JsonObject & { extensionVersion: SemVerString }> {
  const { version } = browser.runtime.getManifest();

  const extensionVersion = validateSemVerString(version);

  if (!isObject(error)) {
    return { extensionVersion };
  }

  const axiosError = selectAxiosError(error);

  if (
    axiosError &&
    ((await flagOn("enterprise-telemetry")) || (await isAppRequest(axiosError)))
  ) {
    return {
      extensionVersion,
      url: selectAbsoluteUrl(axiosError.config),
    };
  }

  return { extensionVersion };
}

/**
 * Report to the PixieBrix error telemetry service/
 * @see reportToRollbar
 */
export async function reportToErrorService(
  error: Error,
  flatContext: MessageContext,
  message: string
): Promise<void> {
  expectContext(
    "background",
    // The buffer/flush call is local to the background page
    "reportToErrorService should only be called from the background page"
  );

  if (flatContext.extensionId == null) {
    // Only report errors that occurred within a user-defined extension/blueprint. Other errors only go to Rollbar.
    // (They're problems with our software.)
    return;
  }

  if (hasCancelRootCause(error)) {
    return;
  }

  if (!(await allowsTrack())) {
    // We warn that tracking is disabled in the analogous call to report to Rollbar. See reportToRollbar
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
    extension_uuid: flatContext.extensionId,
    extension_label: flatContext.extensionLabel,
    step_label: flatContext.label,
    user_agent: window.navigator.userAgent,
    user_agent_extension_version: extensionVersion,
    is_application_error: !hasBusinessRootCause(error),
    // Already capturing extension version in user_agent_extension_version
    error_data: data,
    timestamp: new Date().toISOString(),
  };

  // For blueprint_version/service_version/brick_version the server can't handle null value. Must leave the property
  // off completely.

  if (flatContext.blueprintId) {
    payload.blueprint_version = {
      id: flatContext.blueprintId,
      version: flatContext.blueprintVersion,
    };
  }

  if (flatContext.serviceId) {
    payload.service_version = {
      id: flatContext.serviceId,
      version: flatContext.serviceVersion,
    };
  }

  if (flatContext.blockId) {
    payload.brick_version = {
      id: flatContext.blockId,
      version: flatContext.blockVersion,
    };
  }

  buffer.push(payload);

  await debouncedFlush();
}
