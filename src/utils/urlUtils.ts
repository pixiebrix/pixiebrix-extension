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

import { BusinessError } from "@/errors/businessErrors";
import { isNullOrBlank } from "@/utils/stringUtils";
import { type Nullishable, assertNotNullish } from "./nullishUtils";

const SPACE_ENCODED_VALUE = "%20";

// Preserve the previous default for backwards compatibility
// https://github.com/pixiebrix/pixiebrix-extension/pull/3076#discussion_r844564894
export const LEGACY_URL_INPUT_SPACE_ENCODING_DEFAULT = "plus";

export const URL_INPUT_SPACE_ENCODING_DEFAULT = "percent";

/**
 * Returns true if `url` lacks a protocol and hostname, indicating it's a relative URL
 */
export function isUrlRelative(url: string): boolean {
  return !url.startsWith("//") && !url.includes("://");
}

/**
 * Get the absolute URL from a request configuration, ensuring it's fully parseable
 *
 * @warning Does NOT include the query params from the request unless
 * they were passed in with the URL instead of as params.
 */
export function selectAbsoluteUrl({
  url,
  baseURL,
}: {
  url?: string;
  baseURL?: string;
} = {}): string {
  assertNotNullish(url, "selectAbsoluteUrl: The URL was not provided");
  if (canParseUrl(url)) {
    return url;
  }

  assertNotNullish(baseURL, "selectAbsoluteUrl: The base URL was not provided");

  if (canParseUrl(url, baseURL)) {
    return new URL(url, baseURL).href;
  }

  const baseUrlInfo = baseURL ? ` (base URL: ${String(baseURL)})` : "";
  throw new Error(`Invalid URL: ${String(url)}${baseUrlInfo}`);
}

export function makeURL(
  url: string,
  params: Record<string, Nullishable<string | number | boolean>> = {},
  spaceEncoding: "plus" | "percent" = URL_INPUT_SPACE_ENCODING_DEFAULT,
): string {
  // https://javascript.info/url#searchparams
  const result = new URL(url, location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (isNullOrBlank(value)) {
      result.searchParams.delete(key);
    } else {
      result.searchParams.set(key, String(value));
    }
  }

  if (spaceEncoding === "percent" && result.search.length > 0) {
    result.search = result.search.replaceAll("+", SPACE_ENCODED_VALUE);
  }

  return result.href;
}

/**
 * Returns `url` without a trailing slash
 * @param url the URL to possibly remove the trailing slash from
 */
export function withoutTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Returns true if `url1` and `url2` match as either URL or href, ignoring trailing slashes
 * @param url1 the first URL to compare
 * @param url2 the second URL to compare
 */
export function urlsMatch(url1: string | URL, url2: string | URL): boolean {
  const href1 = typeof url1 === "string" ? url1 : url1.href;
  const href2 = typeof url2 === "string" ? url2 : url2.href;
  return withoutTrailingSlash(href1) === withoutTrailingSlash(href2);
}

/**
 * Equivalent to URL.canParse
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URL/canParse_static)
 *
 */
// TODO: Use `URL.canParse` after dropping support for Chrome <120
export function canParseUrl(url: unknown, baseURL?: unknown): url is string {
  try {
    // eslint-disable-next-line no-new -- Equivalent to URL.canParse
    new URL(url as string, baseURL as string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a URL with one of the allow-listed schemas, or throws a BusinessError
 * @param url an absolute or relative URL
 * @param allowedProtocols the protocol allow-list, including the colon (e.g., "https:")
 * @throws BusinessError if the URL is invalid
 */
export function assertProtocolUrl(
  url: string,
  allowedProtocols: string[],
): void {
  if (!canParseUrl(url)) {
    throw new BusinessError(`Invalid URL: ${url}`);
  }

  const { protocol } = new URL(url);
  if (!allowedProtocols.includes(protocol)) {
    throw new BusinessError(
      `Unsupported protocol: ${protocol}. Use ${allowedProtocols.join(", ")}`,
    );
  }
}

export function isPixieBrixDomain(url: Nullishable<string>): boolean {
  if (url == null) {
    return false;
  }

  if (!canParseUrl(url)) {
    return false;
  }

  const { hostname } = new URL(url);
  return hostname === "pixiebrix.com" || hostname.endsWith(".pixiebrix.com");
}
