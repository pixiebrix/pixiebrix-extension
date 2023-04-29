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
import { useCallback, useEffect } from "react";
import { recipesActions } from "./recipesSlice";
import { type RegistryId } from "@/types/registryTypes";
import {
  type AsyncState,
  type FetchableAsyncState,
  type UseCachedQueryResult,
} from "@/types/sliceTypes";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";

/**
 * Lookup a recipe from the registry by ID, or null if it doesn't exist
 *
 * Note: This hook will return a new result object every time any piece of
 *  the state changes. So, if you destructure the "data" field at a call-site,
 *  and then you use the resulting recipe as a dependency for another hook,
 *  you should assume that the recipe will change reference and fire your hook
 *  any time any of the various fetching/loading flags change in the state of
 *  this hook.
 */
export function useRecipe(
  id: RegistryId
): FetchableAsyncState<RecipeDefinition | null> {
  const state = useAllRecipes();

  // TODO: add a useMemoCompare to avoid changing recipe content didn't change on remote fetch
  // TODO: automatically perform a remote fetch if the recipe is not found locally

  const recipeState = useDeriveAsyncState(
    state,
    async (recipes: RecipeDefinition[]) =>
      recipes?.find((x) => x.metadata.id === id)
  );

  return { ...recipeState, refetch: state.refetch };
}

/**
 * Lookup a recipe from the registry by ID, or return an error state if it doesn't exist
 * @param id the registry id of the recipe
 */
export function useRequiredRecipe(
  id: RegistryId
): AsyncState<RecipeDefinition> {
  const state = useAllRecipes();

  // TODO: add a useMemoCompare to avoid changing recipe content didn't change on remote fetch.
  // TODO: automatically perform a remote fetch if the recipe is not found locally

  return useDeriveAsyncState(state, async (recipes: RecipeDefinition[]) => {
    const recipe = recipes?.find((x) => x.metadata.id === id);
    if (!recipe) {
      throw new Error(`Recipe ${id} not found`);
    }

    return recipe;
  });
}

/**
 * Pulls all recipes from the local registry, and triggers remote refresh if they're not available locally.
 */
export function useAllRecipes(): UseCachedQueryResult<RecipeDefinition[]> {
  const dispatch = useDispatch();
  const refetch = useCallback(
    () => dispatch(recipesActions.refreshRecipes()),
    [dispatch]
  );
  const state = useSelector(selectAllRecipes);

  useEffect(() => {
    if (state.isCacheUninitialized && !state.isFetchingFromCache) {
      dispatch(recipesActions.loadRecipesFromCache());
    }
  }, [dispatch, state.isCacheUninitialized, state.isFetchingFromCache]);

  useEffect(() => {
    if (state.isUninitialized && !state.isFetching) {
      dispatch(recipesActions.refreshRecipes());
    }
  }, [dispatch, state.isUninitialized, state.isFetching]);

  return { ...state, refetch };
}
