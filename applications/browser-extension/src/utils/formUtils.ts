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

import { type Nullishable } from "@/utils/nullishUtils";
import { compact } from "lodash";

const specialCharsRegex = /[\s.[\]]/;

/**
 * Create a Formik field name, validating the individual path parts.
 * Wraps parts with special characters in brackets, so Formik treat it as a single property name.
 * Stringifies numeric property access as "foo.0.bar"
 * @param baseFieldName The base field name
 * @param rest the other Formik field name path parts
 * @throws Error if a path part is invalid
 */
export function joinName(
  baseFieldName: string | null,
  ...rest: Array<Nullishable<string>>
): string {
  const fieldNames = compact(rest);

  if (fieldNames.length === 0) {
    throw new Error(
      "Expected one or more field names to join with the main path",
    );
  }

  let path = baseFieldName || "";
  for (const fieldName of fieldNames) {
    if (specialCharsRegex.test(fieldName)) {
      path += `["${fieldName}"]`;
    } else if (path === "") {
      path = fieldName;
    } else {
      path += `.${fieldName}`;
    }
  }

  return path;
}

/**
 * Join parts of a path, ignoring null/blank parts.
 * Works faster than joinName.
 * Use this one when there are no special characters in the name parts or
 * the parts contain already joined paths rather than individual property names
 * @see joinName
 */
export function joinPathParts(
  ...nameParts: Array<string | number | null>
): string {
  // Don't use lodash.compact and lodash.isEmpty because they treat 0 as falsy
  return nameParts.filter((x) => x != null && x !== "").join(".");
}
