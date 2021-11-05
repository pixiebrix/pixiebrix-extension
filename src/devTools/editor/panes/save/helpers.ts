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

import { IExtension, RegistryId, Metadata } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import { PACKAGE_REGEX } from "@/types/helpers";
import { compact } from "lodash";
import { FormState } from "@/devTools/editor/slices/editorSlice";

export const generatePersonalRecipeId = (
  scope: string,
  sourceId: RegistryId
) => {
  const match = PACKAGE_REGEX.exec(sourceId);
  return compact([scope, match.groups?.collection, match.groups?.name]).join(
    "/"
  );
};

export const isRecipeEditable = (scope: string, recipe: RecipeDefinition) => {
  const match = PACKAGE_REGEX.exec(recipe.metadata.id);
  return scope === match.groups?.scope;
};

export const produceNewRecipe = (
  sourceRecipe: RecipeDefinition,
  metadata: Metadata,
  recipeElements: FormState[],
  recipeExtensions: IExtension[]
) => {
  const newRecipe: RecipeDefinition = {
    ...sourceRecipe,
    metadata,
  };
  delete newRecipe.sharing;

  return newRecipe;
};
