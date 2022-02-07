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

import { BusinessError, getErrorMessage, isAxiosError } from "@/errors";
import {
  ClientNetworkError,
  ClientNetworkPermissionError,
  RemoteServiceError,
  SanitizedURL,
} from "@/services/errors";
import browser from "webextension-polyfill";
import { expectContext } from "@/utils/expectContext";
import { AxiosError, AxiosRequestConfig } from "axios";
import { testMatchPatterns } from "@/blocks/available";
import { getBaseURL } from "@/services/baseService";
import { getReasonPhrase } from "http-status-codes";
import { isAbsoluteUrl } from "@/utils";
import urljoin from "url-join";

export function selectAbsoluteUrl({
  url,
  baseURL,
}: AxiosRequestConfig): string {
  return isAbsoluteUrl(url) ? url : urljoin(baseURL, url);
}

export function safeGuessStatusText(code: string | number): string | null {
  try {
    return getReasonPhrase(code);
  } catch {
    return null;
  }
}

async function isAppRequest(error: AxiosError): Promise<boolean> {
  const baseURL = await getBaseURL();
  const requestUrl = selectAbsoluteUrl(error.config);
  return testMatchPatterns([`${baseURL}/*`], requestUrl);
}

export async function enrichRequestError(error: unknown): Promise<unknown> {
  expectContext("extension");

  console.trace("enrichRequestError", {
    error,
  });

  if (!isAxiosError(error)) {
    return error;
  }

  let url: URL;

  try {
    url = new URL(selectAbsoluteUrl(error.config));
  } catch (typeError) {
    return new BusinessError(
      `Invalid Request URL: ${getErrorMessage(typeError)}`
    );
  }

  if (url.protocol !== "https:") {
    return new BusinessError(
      `Unsupported protocol ${url.protocol}. Use https:`
    );
  }

  const includeUrl = await isAppRequest(error);
  const sanitizedUrl = (includeUrl ? url.href : null) as SanitizedURL;

  if (error.response) {
    return new RemoteServiceError(
      error.response.statusText ?? error.message,
      error,
      sanitizedUrl
    );
  }

  const hasPermissions = await browser.permissions.contains({
    origins: [error.request.url],
  });

  if (!hasPermissions) {
    return new ClientNetworkPermissionError(
      "Insufficient browser permissions to make request.",
      error,
      sanitizedUrl
    );
  }

  return new ClientNetworkError(
    "No response received. Your browser may have blocked the request. See https://docs.pixiebrix.com/network-errors for troubleshooting information",
    error,
    sanitizedUrl
  );
}
