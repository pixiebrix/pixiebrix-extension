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

import { getErrorMessage } from "@/errors/errorHelpers";
import { forbidContext } from "@/utils/expectContext";
import chromeP from "webext-polyfill-kinda";
import { isGoogleInitialized } from "@/contrib/google/initGoogle";

/**
 * The user or account policy explicitly denied the permission.
 * See: https://chromium.googlesource.com/chromium/src/+/ee37f1b7c6da834dec9056283cf83d88b0f2f53c/chrome/browser/extensions/api/identity/identity_api.cc#59
 */
const AUTH_ERROR_USER_REJECTED = "The user did not approve access.";

export function isAuthRejectedError(error: unknown): boolean {
  return getErrorMessage(error).includes(AUTH_ERROR_USER_REJECTED);
}

/**
 * Wrapper around https://developer.chrome.com/docs/extensions/reference/identity/#method-getAuthToken
 * @param scopes A list of OAuth2 scopes to request.
 * @param interactive Fetching a token may require the user to sign-in to Chrome, or approve the application's requested
 * scopes. If the interactive flag is true, getAuthToken will prompt the user as necessary. When the flag is false or
 * omitted, getAuthToken will return failure any time a prompt would be required.
 */
export async function ensureGoogleToken(
  scopes: string[],
  { interactive = true } = {}
): Promise<string> {
  forbidContext(
    "contentScript",
    "The Google API is not available in content script context"
  );

  if (!isGoogleInitialized()) {
    throw new TypeError("Google API not loaded");
  }

  try {
    // Chrome-only API, do not use browser.*
    const token = (await chromeP.identity.getAuthToken({
      interactive,
      // Overrides the blank list of scopes specified in manifest.json.
      scopes,
    })) as string; // `webext-polyfill-kinda` resolves with the first parameter of the callback, but in MV3 it resolves with an object
    if (token) {
      // https://bumbu.me/gapi-in-chrome-extension
      gapi.auth.setToken({ access_token: token } as GoogleApiOAuth2TokenObject);
      return token;
    }
  } catch (error) {
    throw new Error(`Cannot get Chrome OAuth token: ${getErrorMessage(error)}`);
  }

  throw new Error(
    "Cannot get Chrome OAuth token: chrome.identity.getAuthToken did not return a token."
  );
}

class PermissionsError extends Error {
  override name = "PermissionsError";

  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function handleGoogleRequestRejection(
  token: string,
  error: any
): Promise<Error> {
  console.debug("Google rejected request", { error });
  if (error.result == null) {
    return error;
  }

  const status = error.result?.error.code;

  if (status === 404) {
    return new PermissionsError(
      "Cannot locate the Google drive resource. Have you been granted access?",
      status
    );
  }

  if ([403, 401].includes(status)) {
    await chromeP.identity.removeCachedAuthToken({ token });
    console.debug(
      "Bad Google OAuth token. Removed the auth token from the cache so the user can re-authenticate"
    );
    return new PermissionsError(
      `Permission denied, re-authenticate with Google and try again. Details: ${getErrorMessage(
        error.result.error
      )}`,
      status
    );
  }

  return new Error(getErrorMessage(error.result.error));
}
