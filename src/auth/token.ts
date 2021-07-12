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

import { readStorage, setStorage } from "@/chrome";
import equal from "fast-deep-equal";
import { browser } from "webextension-polyfill-ts";
import Cookies from "js-cookie";
import { updateAuth as updateRollbarAuth } from "@/telemetry/rollbar";

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

export async function getExtensionToken(): Promise<string | null> {
  const valueJSON = await readStorage(STORAGE_EXTENSION_KEY);
  return valueJSON ? JSON.parse(valueJSON as string).token : undefined;
}

export async function getExtensionAuth(): Promise<UserData> {
  const valueJSON = await readStorage(STORAGE_EXTENSION_KEY);
  if (valueJSON) {
    const { user, email, hostname } = JSON.parse(valueJSON as string);
    return { user, email, hostname };
  }
  return {};
}

export async function clearExtensionAuth(): Promise<void> {
  await browser.storage.local.remove(STORAGE_EXTENSION_KEY);
  Cookies.remove("csrftoken");
  Cookies.remove("sessionid");
}

/**
 * Refresh the Chrome extensions auth (user, email, token, hostname), and return true iff it was updated.
 */
export async function updateExtensionAuth(auth: AuthData): Promise<boolean> {
  if (auth) {
    let previous;
    try {
      const valueJSON = await readStorage(STORAGE_EXTENSION_KEY);
      previous = JSON.parse(valueJSON as string);
    } catch {
      // pass
    }
    console.debug(`Setting extension auth for ${auth.email}`, auth);
    await updateRollbarAuth({
      userId: auth.user,
      email: auth.email,
      organizationId: auth.telemetryOrganizationId ?? auth.organizationId,
    });
    await setStorage(STORAGE_EXTENSION_KEY, JSON.stringify(auth));
    return !equal(auth, previous);
  }
  return false;
}
