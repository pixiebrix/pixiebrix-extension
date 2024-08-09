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

import axios, { type AxiosError, type AxiosInstance } from "axios";
import { getBaseURL } from "@/data/service/baseService";
import {
  addAuthListener,
  clearPartnerAuthData,
  getAuthHeaders,
  getPartnerAuthData,
  isLinked,
} from "@/auth/authStorage";
import {
  ExtensionNotLinkedError,
  SuspiciousOperationError,
} from "@/errors/genericErrors";
import { isUrlRelative } from "@/utils/urlUtils";
import createAuthRefreshInterceptor from "axios-auth-refresh";
import { selectAxiosError } from "@/data/service/requestErrorUtils";
import { getURLApiVersion } from "@/data/service/apiVersioning";
import { isAuthenticationAxiosError } from "@/auth/isAuthenticationAxiosError";
import { refreshPartnerAuthentication } from "@/background/messenger/api";

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

let apiClientInstance: AxiosInstance | null = null;

async function setupApiClient(): Promise<void> {
  const [authHeaders, partnerAuthData] = await Promise.all([
    getAuthHeaders(),
    getPartnerAuthData(),
  ]);

  apiClientInstance = axios.create({
    baseURL: await getBaseURL(),
    headers: { ...authHeaders },
  });

  apiClientInstance.interceptors.request.use(async (config) => {
    const apiVersion = getURLApiVersion(config.url);

    // Create a clone to avoid the no-param-reassign eslint rule
    const newConfig = config;

    // If apiVersion is the default version (see DEFAULT_API_VERSION), we don't necessarily need the header,
    // but let's include it because it has the following benefits:
    // - The explicit version header makes troubleshooting easier
    // - Allows us to change the default version without breaking clients, see https://github.com/pixiebrix/pixiebrix-app/issues/5060
    newConfig.headers = {
      ...config.headers,
      Accept: `application/json; version=${apiVersion}`,
    };

    return newConfig;
  });

  // Create auth interceptor for partner auth refresh tokens
  if (partnerAuthData?.refreshToken) {
    createAuthRefreshInterceptor(
      apiClientInstance,
      async () => {
        try {
          console.info("Refreshing partner token");
          await refreshPartnerAuthentication();
        } catch (error) {
          console.warn("Failed to refresh partner token", error);
          await clearPartnerAuthData();
        }
      },
      {
        shouldRefresh(error: AxiosError) {
          const axiosError = selectAxiosError(error);
          if (!axiosError) {
            return false;
          }

          return axiosError && isAuthenticationAxiosError(axiosError);
        },
      },
    );
  }
}

let apiClientSetupPromise: Promise<void> | null = null;

async function safeSetupClient(): Promise<void> {
  try {
    apiClientSetupPromise = setupApiClient();
    await apiClientSetupPromise;
  } catch (error) {
    console.error("Failed to setup api client", error);
  }
}

/**
 * Returns an Axios client for making (optionally) authenticated API requests to PixieBrix.
 */
export async function getApiClient(): Promise<AxiosInstance> {
  if (apiClientSetupPromise == null) {
    await safeSetupClient();
  }

  await apiClientSetupPromise;

  if (apiClientInstance == null) {
    throw new Error(
      "Api client instance not found, something went wrong during client setup.",
    );
  }

  return apiClientInstance;
}

/**
 * Returns an Axios client for making authenticated API requests to PixieBrix.
 * @throws ExtensionNotLinkedError if the extension has not been linked to the API yet
 */
export async function getLinkedApiClient(): Promise<AxiosInstance> {
  if (!(await isLinked())) {
    throw new ExtensionNotLinkedError();
  }

  return getApiClient();
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

export function initApiClient() {
  if (apiClientInstance != null) {
    console.warn(
      "initApiClient() called, but the client instance already exists.",
    );
  }

  // We could remove this and defer setup to the first time the client is
  // requested, if we need to improve background script startup time
  void safeSetupClient();

  addAuthListener(() => {
    void safeSetupClient();
  });
}
