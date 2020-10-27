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

// @ts-ignore: types not defined for match-pattern
import matchPattern from "match-pattern";
import castArray from "lodash/castArray";
import groupBy from "lodash/groupBy";
import sortBy from "lodash/sortBy";
import uniq from "lodash/uniq";
import { IPermissions } from "@/core";
import { Availability } from "@/blocks/types";

export function testMatchPattern(pattern: string, url?: string): boolean {
  const re = matchPattern.parse(pattern);
  if (!re) {
    throw new Error(
      `Pattern not recognized as valid match pattern: ${pattern}`
    );
  }

  return re.test(url ?? document.location.href);
}

function testSelector(selector: string): boolean {
  return $(selector).length > 0;
}

export async function checkAvailable({
  matchPatterns: rawPatterns = [],
  selectors: rawSelectors = [],
}: Availability): Promise<boolean> {
  const matchPatterns = castArray(rawPatterns);
  const selectors = castArray(rawSelectors);

  // check matchPatterns first b/c they'll be faster
  if (
    matchPatterns.length &&
    !matchPatterns.every((x) => testMatchPattern(x))
  ) {
    // console.debug(
    //   `Location doesn't match any pattern: ${document.location.href}`
    // );
    return false;
  }
  if (selectors.length && !selectors.every(testSelector)) {
    // console.debug ("Page doesn't match any selectors");
    return false;
  }
  return true;
}

export function distinctPermissions(
  permissions: IPermissions[]
): IPermissions[] {
  return Object.values(
    groupBy(permissions, (x) => JSON.stringify(sortBy(x.origins)))
  ).map((perms) => ({
    permissions: uniq(perms.flatMap((x) => x.permissions || [])),
    origins: perms[0].origins,
  }));
}

export function makePermissions({
  matchPatterns: rawPatterns = [],
}: {
  matchPatterns: string | string[];
}): IPermissions {
  const matchPatterns = castArray(rawPatterns);
  const origins = matchPatterns.length
    ? matchPatterns
    : ["http://*/", "https://*/"];
  return {
    permissions: ["tabs", "webNavigation"],
    origins,
  };
}
