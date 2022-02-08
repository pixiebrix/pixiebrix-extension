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

import browser from "webextension-polyfill";
import Cookies from "js-cookie";
import { isEqual } from "lodash";
import { ManualStorageKey, readStorage, setStorage } from "@/chrome";
import {
  BrowserAuthData,
  USER_DATA_UPDATE_KEYS,
  UserData,
  UserDataUpdate,
} from "./authTypes";

const STORAGE_EXTENSION_KEY = "extensionKey" as ManualStorageKey;

type AuthListener = (auth: Partial<BrowserAuthData>) => void;

const listeners: AuthListener[] = [];

// Use listeners to allow inversion of control and avoid circular dependency with rollbar.
export function addListener(handler: AuthListener): void {
  listeners.push(handler);
}

export async function readAuthData(): Promise<
  BrowserAuthData | Partial<BrowserAuthData>
> {
  return readStorage(STORAGE_EXTENSION_KEY, {});
}

export async function getExtensionToken(): Promise<string | undefined> {
  const { token } = await readAuthData();
  return token;
}

/**
 * Return `true` if the extension is linked to the API.
 *
 * NOTE: do not use this as a check before making an authenticated API call. Instead use `maybeGetLinkedApiClient` which
 * avoids a race condition between the time the check is made and underlying `getExtensionToken` call to get the token.
 *
 * @see maybeGetLinkedApiClient
 */
export async function isLinked(): Promise<boolean> {
  return (await getExtensionToken()) != null;
}

export async function getExtensionAuth(): Promise<UserData> {
  const { user, email, hostname } = await readAuthData();
  return { user, email, hostname };
}

export async function clearExtensionAuth(): Promise<void> {
  await browser.storage.local.remove(STORAGE_EXTENSION_KEY);
  Cookies.remove("csrftoken");
  Cookies.remove("sessionid");
}

/**
 * Update user data (for use in rollbar, etc.), but not the auth token.
 */
export async function updateUserData(update: UserDataUpdate): Promise<void> {
  const updated = await readAuthData();

  for (const key of USER_DATA_UPDATE_KEYS) {
    // eslint-disable-next-line security/detect-object-injection -- keys from compile-time constant
    updated[key] = update[key];
  }

  await setStorage(STORAGE_EXTENSION_KEY, updated);
}

/**
 * Refresh the Chrome extensions auth (user, email, token, API hostname), and return true if it was updated.
 */
export async function updateExtensionAuth(
  auth: BrowserAuthData
): Promise<boolean> {
  if (!auth) {
    return false;
  }

  // Note: `auth` is a `Object.create(null)` object, which for some `isEqual` implementations
  // isn't deeply equal to `{}`.  _.isEqual is fine, `fast-deep-equal` isn't
  // https://github.com/pixiebrix/pixiebrix-extension/pull/1016
  if (isEqual(auth, await readAuthData())) {
    // The auth hasn't changed
    return false;
  }

  console.debug(`Setting extension auth for ${auth.email}`, auth);
  await setStorage(STORAGE_EXTENSION_KEY, auth);
  return true;
}

browser.storage.onChanged.addListener((changes, storage) => {
  if (storage === "local") {
    // eslint-disable-next-line security/detect-object-injection -- compile time constant
    const change = changes[STORAGE_EXTENSION_KEY];

    if (change) {
      for (const listener of listeners) {
        listener(change.newValue);
      }
    }
  }
});
