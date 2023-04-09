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

import { type RecipeDefinition } from "@/types/recipeTypes";
import { useDispatch, useSelector } from "react-redux";
import { selectAllRecipes } from "@/recipes/recipesSelectors";
import { useMemo } from "react";
import { recipesActions } from "./recipesSlice";
import { type RegistryId } from "@/types/registryTypes";
import { type UseCachedQueryResult } from "@/types/sliceTypes";

/**
 * Lookup a recipe from the registry by ID, or null if it doesn't exist
 */
export function useRecipe(
  id: RegistryId
): UseCachedQueryResult<RecipeDefinition | null> {
  const { data: allRecipes, ...rest } = useAllRecipes();
  const recipe = useMemo(
    () => allRecipes?.find((x) => x.metadata.id === id),
    [id, allRecipes]
  );

  return { data: recipe, ...rest };
}

/**
 * Pulls all recipes from the registry, and triggers refresh if they're not available locally.
 */
export function useAllRecipes(): UseCachedQueryResult<RecipeDefinition[]> {
  const dispatch = useDispatch();
  const refetch = () => dispatch(recipesActions.refreshRecipes());
  const state = useSelector(selectAllRecipes);

  if (state.isCacheUninitialized && !state.isFetchingFromCache) {
    dispatch(recipesActions.loadRecipesFromCache());
  }

  if (state.isUninitialized && !state.isFetching) {
    dispatch(recipesActions.refreshRecipes());
  }

  return { ...state, refetch };
}
