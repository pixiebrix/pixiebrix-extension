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

import { INNER_SCOPE, type RegistryId } from "@/types/registryTypes";
import { validateRegistryId } from "@/types/helpers";
import slugify from "slugify";
import { split } from "lodash";
import { type Nullishable } from "@/utils/nullishUtils";

/**
 * Returns true if the value is a valid internal registry id, i.e., that should not be displayed to the user.
 */
export function isInternalRegistryId(value: RegistryId): boolean {
  return value.startsWith(`${INNER_SCOPE}/`);
}

/**
 * Return a valid package id, or empty string in case of error.
 * @param scope a user scope, with the leading `@`
 * @param label the mod component label
 */
export function generatePackageId(
  scope: Nullishable<string>,
  label: string | undefined,
): RegistryId {
  try {
    return validateRegistryId(
      `${scope}/${slugify(label ?? "", { lower: true, strict: true })}`,
    );
  } catch {
    return "" as RegistryId;
  }
}

/**
 * Splits a value into a scope and id, based on scope starting with @ and id
 *  as everything following the first / character
 * @param value the full RegistryId
 */
export function getScopeAndId(value: RegistryId): {
  scope: string | undefined;
  id: string | undefined;
} {
  // Scope needs to start with @
  if (!value.startsWith("@")) {
    return { scope: undefined, id: value };
  }

  // If the value starts with @ and doesn't have a slash, interpret it as a scope
  if (!value.includes("/")) {
    return { scope: value, id: undefined };
  }

  const [scope, ...idParts] = split(value, "/");
  return { scope, id: idParts.join("/") };
}
