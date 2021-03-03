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

export function ensureAuth(
  scopes: string[],
  { interactive }: { interactive: boolean } = { interactive: true }
): Promise<string> {
  if (!gapi) {
    throw new Error("Google API not loaded. Are you using Chrome?");
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive, scopes }, (token: string) => {
      if (chrome.runtime.lastError != null) {
        reject(
          new Error(
            `Cannot get Chrome OAuth token: ${chrome.runtime.lastError.message}`
          )
        );
      } else if (token) {
        // https://bumbu.me/gapi-in-chrome-extension
        gapi.auth.setToken({ access_token: token } as any);
        resolve(token);
      } else {
        reject("Could not get Chrome OAuth token");
      }
    });
    if (chrome.runtime.lastError != null) {
      reject(chrome.runtime.lastError.message);
    }
  });
}

export async function resetToken(scopes: string[]): Promise<void> {
  const token = await new Promise<string>((resolve) => {
    chrome.identity.getAuthToken({ scopes, interactive: false }, (token) => {
      resolve(token);
    });
    if (chrome.runtime.lastError) {
      resolve(null);
    }
  });

  if (token) {
    console.debug(`Clearing Google token: ${token}`);

    await new Promise((resolve, reject) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        resolve();
      });
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      }
    });
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

export async function handleRejection(token: string, err: any): Promise<Error> {
  console.debug("Google rejected request", { err });
  if (err.result == null) {
    return err;
  }

  const status = err.result?.error.code;

  if (status === 404) {
    return new PermissionsError(
      "Cannot locate the Google drive resource. Have you been granted access?",
      status
    );
  } else if ([403, 401].includes(status)) {
    await new Promise<void>((resolve, reject) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        resolve();
      });
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      }
    });
    console.debug(
      "Bad Google OAuth token. Removed the auth token from the cache so the user can re-authenticate"
    );
    return new PermissionsError(
      `Permission denied, re-authenticate with Google and try again. Details: ${err.result.error?.message}`,
      status
    );
  } else {
    return new Error(err.result.error?.message ?? "Unknown error");
  }
}
