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

import {
  BusinessError,
  ContextError,
  getErrorMessage,
  isAxiosError,
} from "@/errors";
import {
  ClientNetworkError,
  ClientRequestError,
  ClientNetworkPermissionError,
  RemoteServiceError,
  SerializableAxiosError,
} from "@/services/errors";
import { expectContext } from "@/utils/expectContext";
import { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { testMatchPatterns } from "@/blocks/available";
import {
  DEFAULT_SERVICE_URL,
  getBaseURL,
  withoutTrailingSlash,
} from "@/services/baseService";
import { getReasonPhrase } from "http-status-codes";
import { isAbsoluteUrl } from "@/utils";
import urljoin from "url-join";
import { isEmpty } from "lodash";
import { Except } from "type-fest";

// eslint-disable-next-line prefer-destructuring -- process.env variable
const DEBUG = process.env.DEBUG;

/**
 * Get the absolute URL from a request configuration. Does NOT include the query params from the request unless
 * they were passed in with the URL instead of as params.
 */
export function selectAbsoluteUrl({
  url,
  baseURL,
}: AxiosRequestConfig): string {
  // Using AxiosRequestConfig since the actual request object doesn't seem to be available in all the places we
  // use this method
  return isAbsoluteUrl(url) ? url : urljoin(baseURL, url);
}

/**
 * Version of getReasonPhrase that returns null for unknown status codes
 * @param code the HTML status code
 * @see getReasonPhrase
 */
export function safeGuessStatusText(code: string | number): string | null {
  try {
    return getReasonPhrase(code);
  } catch {
    return null;
  }
}

export async function isAppUrl(url: string): Promise<boolean> {
  const baseURL = await getBaseURL();
  const patterns = [baseURL, DEFAULT_SERVICE_URL].map(
    (url) => `${withoutTrailingSlash(url)}/*`
  );

  return testMatchPatterns(patterns, url);
}

/**
 * Return true iff the error corresponds to a request to PixieBrix API.
 */
export async function isAppRequest(
  error: SerializableAxiosError
): Promise<boolean> {
  const baseURL = await getBaseURL();
  const requestUrl = selectAbsoluteUrl(error.config);
  const patterns = [baseURL, DEFAULT_SERVICE_URL].map(
    (url) => `${withoutTrailingSlash(url)}/*`
  );
  return testMatchPatterns(patterns, requestUrl);
}

/**
 * Heuristically select the most user-friendly error message for an Axios response.
 */
function selectResponseErrorMessage(response: AxiosResponse): string {
  const message = response.data?.message;

  if (typeof message === "string" && !isEmpty(message)) {
    return message;
  }

  if (!isEmpty(response.statusText)) {
    return response.statusText;
  }

  return safeGuessStatusText(response.status) ?? "Unknown error";
}

/**
 * Return the AxiosError associated with an error, or null if error is not associated with an AxiosError
 * @param error
 */
export function selectAxiosError(error: unknown): Except<AxiosError, "toJSON"> {
  if (isAxiosError(error)) {
    return error;
  }

  if (error instanceof ClientRequestError) {
    return error.error;
  }

  if (error instanceof ContextError) {
    return selectAxiosError(error.cause);
  }

  return null;
}

/**
 * Decorate an AxiosError with additional debugging information
 * @param maybeAxiosError
 */
export async function enrichRequestError(
  maybeAxiosError: unknown
): Promise<unknown> {
  expectContext("extension");

  console.trace("enrichRequestError", {
    error: maybeAxiosError,
  });

  if (!isAxiosError(maybeAxiosError)) {
    return maybeAxiosError;
  }

  let url: URL;

  try {
    url = new URL(selectAbsoluteUrl(maybeAxiosError.config));
  } catch (typeError) {
    return new BusinessError(
      `Invalid request URL: ${getErrorMessage(typeError)}`
    );
  }

  if (url.protocol !== "https:" && !DEBUG) {
    return new BusinessError(
      `Unsupported protocol ${url.protocol}. Use https:`
    );
  }

  if (maybeAxiosError.response) {
    return new RemoteServiceError(
      selectResponseErrorMessage(maybeAxiosError.response),
      maybeAxiosError
    );
  }

  const hasPermissions = await browser.permissions.contains({
    origins: [maybeAxiosError.request.url],
  });

  if (!hasPermissions) {
    return new ClientNetworkPermissionError(
      "Insufficient browser permissions to make request.",
      maybeAxiosError
    );
  }

  return new ClientNetworkError(
    "No response received. Your browser may have blocked the request. See https://docs.pixiebrix.com/network-errors for troubleshooting information",
    maybeAxiosError
  );
}
