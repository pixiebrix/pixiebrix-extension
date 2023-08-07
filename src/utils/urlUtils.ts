/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { isNullOrBlank } from "@/utils/stringUtils";

const SPACE_ENCODED_VALUE = "%20";

// Preserve the previous default for backwards compatibility
// https://github.com/pixiebrix/pixiebrix-extension/pull/3076#discussion_r844564894
export const LEGACY_URL_INPUT_SPACE_ENCODING_DEFAULT = "plus";

export const URL_INPUT_SPACE_ENCODING_DEFAULT = "percent";

/**
 * Returns true if `url` is an absolute URL, based on whether the URL contains a schema
 */
export function isAbsoluteUrl(url: string): boolean {
  return /(^|:)\/\//.test(url);
}

export function makeURL(
  url: string,
  params: Record<string, string | number | boolean> = {},
  spaceEncoding: "plus" | "percent" = URL_INPUT_SPACE_ENCODING_DEFAULT
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

/** Like `new URL(url)` except it never throws and always returns an URL object, empty if the url is invalid */
export function safeParseUrl(url: string, baseUrl?: string): URL {
  try {
    return new URL(url, baseUrl);
  } catch {
    return new URL("invalid-url://");
  }
}

/**
 * Returns true if `value` is a valid absolute URL with a protocol in `protocols`
 * @param value the value to check
 * @param protocols valid protocols including colon, defaults to http: and https:
 */
export function isValidUrl(
  value: string,
  { protocols = ["http:", "https:"] }: { protocols?: string[] } = {}
): boolean {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol);
  } catch {
    return false;
  }
}
