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
import { debounce, omit } from "lodash";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import { MessageContext, SerializedError } from "@/core";
import {
  getRootCause,
  hasBusinessRootCause,
  hasCancelRootCause,
  isAxiosError,
} from "@/errors";
import { allowsTrack } from "@/telemetry/dnt";
import { uuidv4 } from "@/types/helpers";
import { isObject } from "@/utils";
import { readAuthData } from "@/auth/token";
import { isAppRequest, selectAbsoluteUrl } from "@/services/requestErrorUtils";

const EVENT_BUFFER_DEBOUNCE_MS = 2000;
const EVENT_BUFFER_MAX_MS = 10_000;

// FIXME: this type should be pulled from Swagger
const buffer: JsonObject[] = [];

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
      await client.post("/api/errors/", { events });
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
): Promise<JsonObject> {
  const { version: extensionVersion } = browser.runtime.getManifest();

  if (!isObject(error)) {
    return { extensionVersion };
  }

  const cause = getRootCause(error);

  // Handle base classes of ClientRequestError
  if ("error" in cause && isAxiosError(cause.error)) {
    const { flags = [] } = await readAuthData();
    if (
      (await isAppRequest(cause.error)) ||
      flags.includes("enterprise-telemetry")
    ) {
      return {
        extensionVersion,
        url: selectAbsoluteUrl(cause.error.config),
      };
    }
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
  if (flatContext.extensionId == null) {
    // Only report errors that occurred within a user-defined extension/blueprint. Other errors only got to Rollbar
    // because they're problems with our software.
    return;
  }

  if (hasCancelRootCause(error)) {
    return;
  }

  if (!(await allowsTrack())) {
    // We warn that tracking is disabled in the analogous call to report to Rollbar
    return;
  }

  buffer.push({
    uuid: uuidv4(),
    error_name: error.name,
    message,
    // FIXME: this is redundant. The backend should take a single id which it attempts to match to a UserExtension
    //  instance? Or we can just index the field on the backend but not enforce the FK constraint
    user_extension: flatContext.extensionId,
    extension_uuid: flatContext.extensionId,
    // FIXME: we need to track step/extension label separately in MessageContext
    extension_label: flatContext.label,
    step_label: flatContext.label,
    user_agent: window.navigator.userAgent,
    user_agent_extension_version: browser.runtime.getManifest().version,
    is_application_error: !hasBusinessRootCause(error),
    blueprint_id: flatContext.blueprintId,
    // FIXME: track blueprint version in the MessageContext
    blueprint_version: null,
    brick_id: flatContext.blockId ?? flatContext.serviceId,
    brick_version: null,
    // Already capturing extension version in user_agent_extension_version
    error_data: omit(await selectExtraContext(error), ["extensionVersion"]),
  });

  await debouncedFlush();
}
