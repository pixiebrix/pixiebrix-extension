/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import {
  getErrorMessage,
  getRootCause,
  selectError,
} from "@/errors/errorHelpers";
import { isObject } from "@/utils/objectUtils";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import { deleteCachedAuthData } from "@/background/messenger/api";

class PermissionsError extends Error {
  override name = "PermissionsError";

  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function handleGoogleRequestRejection(
  error: unknown,
  googleAccount: SanitizedIntegrationConfig | null,
): Promise<Error> {
  // Request errors from proxyRequest are wrapped in ContextError which includes metadata about the integration
  // configuration. Therefore, get root cause for determining if this is an Axios error
  const rootCause = getRootCause(error);

  console.debug("Error making Google request", { error });

  if (!isObject(error)) {
    // Shouldn't happen in practice, but be defensive
    return new Error("Unknown error making Google request", {
      cause: selectError(error),
    });
  }

  if (!isAxiosError(rootCause) || rootCause.response == null) {
    // It should always be an error-like object at this point, but be defensive.
    return selectError(error);
  }

  const { status } = rootCause.response;

  if ([403, 404].includes(status)) {
    const message =
      status === 403
        ? "You do not have permission to access the Google Drive resource. Have you been granted access? If this resource is public, you need to open it in a separate browser tab before it will appear here."
        : "Cannot locate the Google Drive resource. Have you been granted access?";
    return new PermissionsError(message, status);
  }

  if (status === 401) {
    if (googleAccount) {
      await deleteCachedAuthData(googleAccount.id);
      console.debug(
        "Bad Google client PKCE token. Removed the auth token from the cache so the user can re-authenticate",
      );
    } else {
      console.warn("No auth token provided for request");
    }

    return new PermissionsError(
      `Permission denied, re-authenticate with Google and try again. Details: ${getErrorMessage(
        error,
      )}`,
      status,
    );
  }

  return error as unknown as Error;
}
