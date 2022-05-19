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

import { RegistryId } from "@/core";
import { validateRegistryId } from "@/types/helpers";
import slugify from "slugify";

/**
 * Return a valid recipe id, or return null
 * @param userScope a user scope, with the leading @
 * @param extensionLabel the extension label
 */
export function generateRecipeId(
  userScope: string,
  extensionLabel: string
): RegistryId {
  try {
    return validateRegistryId(
      `${userScope}/${slugify(extensionLabel, { lower: true, strict: true })}`
    );
  } catch {
    return "" as RegistryId;
  }
}
