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

import { isAxiosError, isErrorObject } from "@/errors";
import { AxiosRequestConfig } from "axios";
import { testMatchPatterns } from "@/blocks/available";
import {
  DEFAULT_SERVICE_URL,
  getBaseURL,
  withoutTrailingSlash,
} from "@/services/baseService";
import { isAbsoluteUrl } from "@/utils";
import urljoin from "url-join";
import { SerializableAxiosError } from "@/errors/errorHelpers";

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
 * Return the AxiosError associated with an error, or null if error is not associated with an AxiosError
 */
export function selectAxiosError(
  error: unknown
): SerializableAxiosError | null {
  if (isAxiosError(error)) {
    return error;
  }

  if (isErrorObject(error) && error.cause) {
    return selectAxiosError(error.cause);
  }

  return null;
}
