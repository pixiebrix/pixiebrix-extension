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

import { type ModComponentsRootState } from "@/store/extensionsTypes";
import { createSelector } from "@reduxjs/toolkit";
import { type UnresolvedModComponent } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import { isEmpty } from "lodash";

export function selectExtensions({
  options,
}: ModComponentsRootState): UnresolvedModComponent[] {
  if (!Array.isArray(options.extensions)) {
    console.warn("state migration has not been applied yet", {
      options,
    });
    throw new TypeError("state migration has not been applied yet");
  }

  return options.extensions;
}

const extensionsForRecipeSelector = createSelector(
  selectExtensions,
  (state: ModComponentsRootState, recipeId: RegistryId) => recipeId,
  (extensions, recipeId) =>
    extensions.filter((extension) => extension._recipe?.id === recipeId),
);

export const selectExtensionsForRecipe =
  (recipeId: RegistryId) => (state: ModComponentsRootState) =>
    extensionsForRecipeSelector(state, recipeId);

export const selectRecipeHasAnyExtensionsInstalled =
  (recipeId: RegistryId) => (state: ModComponentsRootState) =>
    !isEmpty(extensionsForRecipeSelector(state, recipeId));
