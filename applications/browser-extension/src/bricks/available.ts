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

import { doesUrlMatchPatterns, isValidPattern } from "webext-patterns";
import { castArray } from "lodash";
import { type Entries } from "type-fest";
import { BusinessError } from "../errors/businessErrors";
import { $safeFind } from "../utils/domUtils";
import { isLoadedInIframe } from "../utils/iframeUtils";
import {
  type Availability,
  type NormalizedAvailability,
} from "@/types/availabilityTypes";
import { type Nullishable } from "../utils/nullishUtils";

export function normalizeAvailability(
  availability: Availability,
): NormalizedAvailability {
  const {
    matchPatterns = [],
    urlPatterns = [],
    selectors = [],
    allFrames = true,
  } = availability;

  return {
    matchPatterns: castArray(matchPatterns),
    urlPatterns: castArray(urlPatterns),
    selectors: castArray(selectors),
    allFrames,
  };
}

export function testMatchPatterns(
  patterns: string[],
  url: Nullishable<string>,
): boolean {
  const targetURL = url ?? document.location.href;

  if (targetURL === "about:srcdoc") {
    // <all_urls> doesn't officially include about:srcdoc, but it works in some cases
    return patterns.includes("<all_urls>");
  }

  try {
    return doesUrlMatchPatterns(targetURL, ...patterns);
  } catch {
    const invalidPattern = patterns.find((pattern) => !isValidPattern(pattern));
    throw new BusinessError(
      `Pattern not recognized as valid match pattern: ${invalidPattern}`,
    );
  }
}

function testUrlPattern(
  pattern: string | URLPatternInit,
  url: Nullishable<string>,
): boolean {
  const targetURL = url ?? document.location.href;

  let compiled;

  try {
    compiled = new URLPattern(pattern);
  } catch {
    if (typeof pattern === "object") {
      for (const [key, entry] of Object.entries(pattern) as Entries<
        typeof pattern
      >) {
        try {
          void new URLPattern({ [key]: entry });
        } catch {
          throw new BusinessError(
            `Pattern for ${key} not recognized as a valid url pattern: ${entry}`,
          );
        }
      }
    }

    // If pattern is an object, one of the entries should trigger the exception above
    throw new BusinessError(
      `Pattern not recognized as a valid url pattern: ${JSON.stringify(
        pattern,
      )}`,
    );
  }

  return compiled.test(targetURL);
}

function testSelector(selector: string): boolean {
  return $safeFind(selector).length > 0;
}

/**
 * Returns true if the availability rules match the given document/URL.
 * @param availability availability rules
 * @param url the URL to check match and URL patterns against, defaults to the document's URL
 */
export async function checkAvailable(
  availability: Availability,
  url?: string,
): Promise<boolean> {
  const { matchPatterns, urlPatterns, selectors, allFrames } =
    normalizeAvailability(availability);

  if (process.env.DEBUG) {
    const result = {
      matchPatterns:
        matchPatterns.length === 0 || testMatchPatterns(matchPatterns, url),
      urlPatterns:
        urlPatterns.length === 0 ||
        urlPatterns.some((pattern) => testUrlPattern(pattern, url)),
      selectors:
        selectors.length === 0 ||
        selectors.some((selector) => testSelector(selector)),
      allFrames: allFrames || !isLoadedInIframe(),
    };

    console.debug(
      "Availability test for",
      document.location.href,
      "vs.",
      availability,
      "had result",
      result,
    );
  }

  if (!allFrames && isLoadedInIframe()) {
    return false;
  }

  // Check matchPatterns and urlPatterns first b/c they're faster than searching selectors

  if (matchPatterns.length > 0 && !testMatchPatterns(matchPatterns, url)) {
    return false;
  }

  if (
    urlPatterns.length > 0 &&
    !urlPatterns.some((pattern) => testUrlPattern(pattern, url))
  ) {
    return false;
  }

  if (
    selectors.length > 0 &&
    !selectors.some((selector) => testSelector(selector))
  ) {
    return false;
  }

  return true;
}
