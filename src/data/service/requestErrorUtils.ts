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

import { isErrorObject } from "@/errors/errorHelpers";
import { type AxiosRequestConfig } from "axios";
import { testMatchPatterns } from "@/bricks/available";
import { getBaseURL } from "@/data/service/baseService";
import urljoin from "url-join";
import {
  isAxiosError,
  type SerializableAxiosError,
} from "@/errors/networkErrorHelpers";
import { isAbsoluteUrl, withoutTrailingSlash } from "@/utils/urlUtils";
import { DEFAULT_SERVICE_URL } from "@/urlConstants";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Get the absolute URL from a request configuration. Does NOT include the query params from the request unless
 * they were passed in with the URL instead of as params.
 */
export function selectAbsoluteUrl({
  url,
  baseURL,
}: // Using AxiosRequestConfig since the actual request object doesn't seem
// to be available in all the places we use this method
AxiosRequestConfig): string {
  assertNotNullish(url, "axios: The URL was not provided");
  if (isAbsoluteUrl(url)) {
    return url;
  }

  assertNotNullish(baseURL, "axios: The base URL was not provided");
  return urljoin(baseURL, url);
}

/**
 * Return true iff the error corresponds to a request to PixieBrix API.
 */
export async function isAppRequestError(
  error: SerializableAxiosError,
): Promise<boolean> {
  const baseURL = await getBaseURL();
  const requestUrl = selectAbsoluteUrl(error.config);
  const patterns = [baseURL, DEFAULT_SERVICE_URL].map(
    (url) => `${withoutTrailingSlash(url)}/*`,
  );
  return testMatchPatterns(patterns, requestUrl);
}

/**
 * Return the AxiosError associated with an error, or null if error is not associated with an AxiosError
 */
export function selectAxiosError(
  error: unknown,
): SerializableAxiosError | null {
  if (isAxiosError(error)) {
    return error;
  }

  if (isErrorObject(error) && error.cause) {
    return selectAxiosError(error.cause);
  }

  return null;
}
