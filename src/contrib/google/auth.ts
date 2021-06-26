/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import chromeP from "webext-polyfill-kinda";

export async function ensureAuth(
  scopes: string[],
  { interactive }: { interactive: boolean } = { interactive: true }
): Promise<string> {
  if (!gapi) {
    throw new Error("Google API not loaded. Are you using Chrome?");
  }

  try {
    const token = await chromeP.identity.getAuthToken({
      interactive,
      scopes,
    });
    if (token) {
      // https://bumbu.me/gapi-in-chrome-extension
      gapi.auth.setToken({ access_token: token } as any);
      return token;
    }
  } catch (error) {
    throw new Error(`Cannot get Chrome OAuth token: ${error.message}`);
  }

  throw new Error(`Cannot get Chrome OAuth token`);
}

export async function resetToken(scopes: string[]): Promise<void> {
  const token = await chromeP.identity
    .getAuthToken({
      interactive: false,
      scopes,
    })
    .catch(() => {});

  if (token) {
    console.debug(`Clearing Google token: ${token}`);
    await chromeP.identity.removeCachedAuthToken({ token });
  }

  await ensureAuth(scopes);
}

class PermissionsError extends Error {
  public readonly status: number;

  constructor(m: string, status: number) {
    super(m);
    this.status = status;
    Object.setPrototypeOf(this, Error.prototype);
  }
}

export async function handleRejection(
  token: string,
  error: any
): Promise<Error> {
  console.debug("Google rejected request", { err: error });
  if (error.result == null) {
    return error;
  }

  const status = error.result?.error.code;

  if (status === 404) {
    return new PermissionsError(
      "Cannot locate the Google drive resource. Have you been granted access?",
      status
    );
  } else if ([403, 401].includes(status)) {
    await chromeP.identity.removeCachedAuthToken({ token });
    console.debug(
      "Bad Google OAuth token. Removed the auth token from the cache so the user can re-authenticate"
    );
    return new PermissionsError(
      `Permission denied, re-authenticate with Google and try again. Details: ${error.result.error?.message}`,
      status
    );
  } else {
    return new Error(error.result.error?.message ?? "Unknown error");
  }
}
