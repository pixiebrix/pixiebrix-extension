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

import { patternToRegex } from "webext-patterns";
import { castArray } from "lodash";
import { Availability } from "@/blocks/types";
import { BusinessError } from "@/errors";
import { $safeFind } from "@/helpers";
import { URLPatternInit } from "urlpattern-polyfill/dist/url-pattern.interfaces";
import { URLPattern } from "urlpattern-polyfill/dist";

export function testMatchPatterns(
  patterns: string[],
  url: string = document.location.href
): boolean {
  let re;

  try {
    // Try all at once
    re = patternToRegex(...patterns);
  } catch {
    // Try them one at a time to find the broken one
    for (const pattern of patterns) {
      try {
        patternToRegex(pattern);
      } catch {
        throw new BusinessError(
          `Pattern not recognized as valid match pattern: ${pattern}`
        );
      }
    }
  }

  return re.test(url);
}

function testUrlPattern(pattern: string | URLPatternInit): boolean {
  let compiled;

  try {
    compiled = new URLPattern(pattern);
  } catch {
    if (typeof pattern === "object") {
      for (const [key, entry] of Object.entries(pattern)) {
        try {
          // eslint-disable-next-line no-new -- constructor will throw a type error
          new URLPattern({ key: entry } as URLPatternInit);
        } catch {
          throw new BusinessError(
            `Pattern for ${key} not recognized as a valid url pattern: ${
              entry as string
            }`
          );
        }
      }
    }

    // If pattern is an object, one of the entries should trigger the exception above
    throw new BusinessError(
      `Pattern not recognized as a valid url pattern: ${JSON.stringify(
        pattern
      )}`
    );
  }

  return compiled.test(location.href);
}

function testSelector(selector: string): boolean {
  return $safeFind(selector).length > 0;
}

export async function checkAvailable({
  matchPatterns: rawMatchPatterns = [],
  urlPatterns: rawUrlPatterns = [],
  selectors: rawSelectors = [],
}: Availability): Promise<boolean> {
  const matchPatterns = rawMatchPatterns ? castArray(rawMatchPatterns) : [];
  const urlPatterns = rawUrlPatterns ? castArray(rawUrlPatterns) : [];
  const selectors = rawSelectors ? castArray(rawSelectors) : [];

  // Check matchPatterns and urlPatterns first b/c they're faster than searching selectors

  if (matchPatterns.length > 0 && !testMatchPatterns(matchPatterns)) {
    return false;
  }

  if (
    urlPatterns.length > 0 &&
    !urlPatterns.some((pattern) => testUrlPattern(pattern))
  ) {
    return false;
  }

  if (
    selectors.length > 0 &&
    !selectors.some((selector) => testSelector(selector))
  ) {
    // Console.debug("Page doesn't match any selectors", selectors);
    return false;
  }

  return true;
}
