/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { patternToRegex } from "webext-patterns";
import castArray from "lodash/castArray";
import groupBy from "lodash/groupBy";
import sortBy from "lodash/sortBy";
import uniq from "lodash/uniq";
import { Availability } from "@/blocks/types";
import { Permissions } from "webextension-polyfill-ts";
import { BusinessError } from "@/errors";

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

function testSelector(selector: string): boolean {
  return $(selector).length > 0;
}

export async function checkAvailable({
  matchPatterns: rawPatterns = [],
  selectors: rawSelectors = [],
}: Availability): Promise<boolean> {
  const matchPatterns = rawPatterns ? castArray(rawPatterns) : [];
  const selectors = rawSelectors ? castArray(rawSelectors) : [];

  // check matchPatterns first b/c they'll be faster
  if (matchPatterns.length > 0 && !testMatchPatterns(matchPatterns)) {
    // console.debug(
    //   `Location doesn't match any pattern: ${document.location.href}`,
    //   matchPatterns
    // );
    return false;
  }
  if (selectors.length > 0 && !selectors.some(testSelector)) {
    // console.debug("Page doesn't match any selectors", selectors);
    return false;
  }
  return true;
}

/**
 * Merge a list of permissions into a single permissions object.
 * @param permissions
 */
export function mergePermissions(
  permissions: Permissions.Permissions[] = []
): Permissions.Permissions {
  return {
    origins: uniq(permissions.flatMap((x) => x.origins ?? [])),
    permissions: uniq(permissions.flatMap((x) => x.permissions ?? [])),
  };
}

export function distinctPermissions(
  permissions: Permissions.Permissions[]
): Permissions.Permissions[] {
  return Object.values(
    groupBy(permissions, (x) => JSON.stringify(sortBy(x.origins)))
  ).map((perms) => ({
    permissions: uniq(perms.flatMap((x) => x.permissions || [])),
    origins: perms[0].origins,
  }));
}
