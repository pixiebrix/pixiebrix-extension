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

import { readStorage, setStorage } from "@/chrome";
import equal from "deep-equal";

const STORAGE_EXTENSION_KEY = "extensionKey";

interface UserData {
  email?: string;
  user?: string;
  hostname?: string;
}

export interface AuthData extends UserData {
  token: string;
}

export function readAuthFromWebsite(): AuthData {
  const container = document.getElementById("container");
  const { token, email, user } = container.dataset;
  return { token, email, user, hostname: location.hostname };
}

export async function getExtensionToken(): Promise<string> {
  const valueJSON = await readStorage(STORAGE_EXTENSION_KEY);
  return JSON.parse(valueJSON as string).token;
}

export async function getExtensionAuth(): Promise<UserData> {
  const valueJSON = await readStorage(STORAGE_EXTENSION_KEY);
  const { user, email, hostname } = JSON.parse(valueJSON as string);
  return { user, email, hostname };
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
    await setStorage(STORAGE_EXTENSION_KEY, JSON.stringify(auth));
    return !equal(auth, previous);
  }
  return false;
}
