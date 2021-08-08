/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { browser } from "webextension-polyfill-ts";
import Cookies from "js-cookie";
import { updateAuth as updateRollbarAuth } from "@/telemetry/rollbar";
import { isEqual } from "lodash";

const STORAGE_EXTENSION_KEY = "extensionKey";

interface UserData {
  email?: string;
  user?: string;
  hostname?: string;
  organizationId?: string;
  telemetryOrganizationId?: string;
}

export interface AuthData extends UserData {
  token: string;
}

export function readAuthFromWebsite(): AuthData {
  const container = document.querySelector<HTMLElement>("#container");
  const {
    token,
    email,
    user,
    organization,
    telemetryOrganization,
  } = container.dataset;
  return {
    token,
    email,
    user,
    organizationId: organization,
    telemetryOrganizationId: telemetryOrganization,
    hostname: location.hostname,
  };
}

async function readAuthData(): Promise<AuthData | Partial<AuthData>> {
  const storage = await browser.storage.local.get({
    [STORAGE_EXTENSION_KEY]: {},
  });
  // eslint-disable-next-line security/detect-object-injection -- Local constant
  const data = storage[STORAGE_EXTENSION_KEY];

  // TODO: Migration only; Drop at some point (Added August 18th 2021)
  if (typeof data === "string") {
    const parsed = JSON.parse(data);
    await browser.storage.local.set({ [STORAGE_EXTENSION_KEY]: parsed });
    return parsed;
  }

  return data;
}

export async function getExtensionToken(): Promise<string | undefined> {
  const { token } = await readAuthData();
  return token;
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
 * Refresh the Chrome extensions auth (user, email, token, hostname), and return true if it was updated.
 */
export async function updateExtensionAuth(auth: AuthData): Promise<boolean> {
  if (!auth) {
    return false;
  }

  void updateRollbarAuth({
    userId: auth.user,
    email: auth.email,
    organizationId: auth.telemetryOrganizationId ?? auth.organizationId,
  });

  // Check if it has changed
  if (isEqual(auth, await readAuthData())) {
    return false;
  }

  console.debug(`Setting extension auth for ${auth.email}`, auth);
  await browser.storage.local.set({ [STORAGE_EXTENSION_KEY]: auth });
  return true;
}
