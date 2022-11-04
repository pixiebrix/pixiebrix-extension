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

import { RegistryRequestState, useRecipe } from "@/hooks/registry";
import { RecipeDefinition } from "@/types/definitions";
import { useSelector } from "react-redux";
import { selectActiveRecipeId } from "../slices/editorSelectors";

/**
 * Selects the active recipe id and pulls it from the registry
 * @returns 'data' is the active recipe, or undefined if there is no active recipe
 */
export function useActiveRecipe(): RegistryRequestState<RecipeDefinition> {
  const recipeId = useSelector(selectActiveRecipeId);
  return useRecipe(recipeId);
}
