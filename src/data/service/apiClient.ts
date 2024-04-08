/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import axios, { type AxiosInstance } from "axios";
import { getBaseURL } from "@/data/service/baseService";
import { getAuthHeaders } from "@/auth/authStorage";
import {
  ExtensionNotLinkedError,
  SuspiciousOperationError,
} from "@/errors/genericErrors";
import { isUrlRelative } from "@/utils/urlUtils";

/**
 * Converts `relativeOrAbsoluteURL` to an absolute PixieBrix service URL
 * @throws SuspiciousOperationError if the absolute URL provided is not for the current base URL
 */
export async function absoluteApiUrl(
  relativeOrAbsoluteURL: string,
): Promise<string> {
  const isRelative = isUrlRelative(relativeOrAbsoluteURL);
  // Avoid calling getBaseURL if the URL is already absolute; it's slow due to managed storage checked

  if (isRelative) {
    const base = await getBaseURL();
    return new URL(relativeOrAbsoluteURL, base).href;
  }

  const base = await getBaseURL();
  if (relativeOrAbsoluteURL.startsWith(base)) {
    return relativeOrAbsoluteURL;
  }

  throw new SuspiciousOperationError(
    `URL is not a PixieBrix service URL: ${relativeOrAbsoluteURL}`,
  );
}

/**
 * Returns an Axios client for making authenticated API requests to PixieBrix.
 * @throws ExtensionNotLinkedError if the extension has not been linked to the API yet
 */
export async function getLinkedApiClient(): Promise<AxiosInstance> {
  const authHeaders = await getAuthHeaders();

  if (!authHeaders) {
    throw new ExtensionNotLinkedError();
  }

  return axios.create({
    baseURL: await getBaseURL(),
    headers: {
      ...authHeaders,
      // Version 2.0 is paginated. Explicitly pass version so we can switch the default version on the server when
      // once clients are all passing an explicit version number
      Accept: "application/json; version=1.0",
    },
  });
}

/**
 * Return linked API client, or `null`.
 * @see getLinkedApiClient
 */
export async function maybeGetLinkedApiClient(): Promise<AxiosInstance | null> {
  try {
    return await getLinkedApiClient();
  } catch (error) {
    if (error instanceof ExtensionNotLinkedError) {
      return null;
    }

    throw error;
  }
}

/**
 * Returns an Axios client for making (optionally) authenticated API requests to PixieBrix.
 */
export async function getApiClient(): Promise<AxiosInstance> {
  const authHeaders = await getAuthHeaders();

  return axios.create({
    baseURL: await getBaseURL(),
    headers: {
      ...authHeaders,
      // Version 2.0 is paginated. Explicitly pass version so we can switch the default version on the server when
      // once clients are all passing an explicit version number
      Accept: "application/json; version=1.0",
    },
  });
}
