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

import type { SemVerString } from "@/types/registryTypes";
import { coerce as semVerCoerce, valid as semVerValid } from "semver";
import { startsWith } from "lodash";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * @param value The string to normalize
 * @param allowLeadingV If `true`, a leading `v` is allowed. This results in a semver string that is not actually valid
 * @param coerce If `true`, the string will be coerced to a valid semver string. See https://www.npmjs.com/package/semver#coercion
 * @returns A normalized semver string
 */
export function normalizeSemVerString(
  value: string,
  // Default to `false` to be stricter.
  {
    allowLeadingV = false,
    coerce = false,
  }: { allowLeadingV?: boolean; coerce?: boolean } = {},
): SemVerString {
  if (value == null) {
    // We don't have strictNullChecks on, so null values will find there way here. We should pass them along. Eventually
    // we can remove this check as strictNullChecks will check the call site
    return value as SemVerString;
  }

  if (testIsSemVerString(value, { allowLeadingV, coerce })) {
    if (coerce) {
      const coerced = semVerValid(semVerCoerce(value));
      if (value.startsWith("v")) {
        return `v${coerced}` as SemVerString;
      }

      return coerced as SemVerString;
    }

    return value;
  }

  console.debug("Invalid semver %s", value);

  throw new TypeError("Invalid semantic version");
}

export function testIsSemVerString(
  value: string,
  {
    // FIXME: the SemVerString type wasn't intended to support a leading `v`. See documentation
    // Default to `false` to be stricter.
    allowLeadingV = false,
    // Default to `false` to be stricter.
    coerce = false,
  }: { allowLeadingV?: boolean; coerce?: boolean } = {},
): value is SemVerString {
  const _value = coerce ? semVerCoerce(value) : value;

  // FIXME: semVerValid allows pre-release and build metadata. That shouldn't supported in our SemVerString type.
  if (semVerValid(_value) != null) {
    return allowLeadingV || !startsWith(value, "v");
  }

  return false;
}

/**
 * Returns a new semver string with the patch segment incremented by 1
 */
export function patchIncrement(semVer: SemVerString): SemVerString {
  const [major, minor, patch] = normalizeSemVerString(semVer).split(".");
  assertNotNullish(patch, "Invalid SemVerString");
  return normalizeSemVerString(
    `${major}.${minor}.${Number.parseInt(patch, 10) + 1}`,
  );
}
