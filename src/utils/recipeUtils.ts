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

import { type RegistryId } from "@/types/registryTypes";
import { validateRegistryId } from "@/types/helpers";
import slugify from "slugify";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

/**
 * Return a valid recipe id, or empty string in case of error.
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

/**
 * Return an array of unique service ids that are required to be configured
 * in order to install this recipe, excluding the PixieBrix service.
 * @param recipe a RecipeDefinition to extract the service ids from
 */
export const getRequiredServiceIds = (recipe: RecipeDefinition) =>
  uniq(
    (recipe.extensionPoints ?? [])
      .flatMap((extensionPoint) => Object.values(extensionPoint.services ?? {}))
      // The PixieBrix service gets automatically configured, so no need to include it
      .filter((serviceId) => serviceId !== PIXIEBRIX_SERVICE_ID)
  );
