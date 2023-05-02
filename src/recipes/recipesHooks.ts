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
import useMemoCompare from "@/hooks/useMemoCompare";
import deepEquals from "fast-deep-equal";
import { loadingAsyncStateFactory } from "@/utils/asyncStateUtils";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";

/**
 * Lookup a recipe from the registry by ID, or null if it doesn't exist.
 *
 * NOTE: uses useAllRecipes which first checks the local cache. So value may change from null to a recipe definition
 * after the remote fetch completes.
 *
 * @param id the registry id of the recipe
 * @see useAllRecipes
 */
export function useRecipe(
  id: RegistryId
): FetchableAsyncState<RecipeDefinition | null> {
  const state = useAllRecipes();

  const findRecipe = useCallback(
    (recipes: RecipeDefinition[]) => recipes.find((x) => x.metadata.id === id),
    [id]
  );

  const recipeState = useMergeAsyncState(state, findRecipe);

  // Avoid reference change when useAllRecipes switches from cache to remote fetch
  const data = useMemoCompare(recipeState.data, deepEquals);
  const currentData = useMemoCompare(recipeState.data, deepEquals);

  return {
    ...recipeState,
    data,
    currentData,
  };
}

/**
 * Lookup a recipe from the registry by ID, or return an error state if it doesn't exist.
 *
 * Only returns an error state if the remote fetch fails. If the recipe is not found in the local cache, it will wait
 * until the remote fetch completes before returning an error state.
 *
 * @param id the registry id of the recipe
 * @see useAllRecipes
 */
export function useRequiredRecipe(
  id: RegistryId
): AsyncState<RecipeDefinition> {
  const state = useAllRecipes();

  const findRecipe = useCallback(
    (recipes: RecipeDefinition[]) => {
      const recipe = recipes.find((x) => x.metadata.id === id);
      if (!recipe) {
        throw new Error(`Recipe ${id} not found`);
      }

      return recipe;
    },
    [id]
  );

  const recipeState = useMergeAsyncState(state, findRecipe);

  // Avoid reference change when useAllRecipes switches from cache to remote fetch
  const data = useMemoCompare(recipeState.data, deepEquals);
  const currentData = useMemoCompare(recipeState.currentData, deepEquals);

  // Don't error until the lookup fails against the remote data
  if (
    recipeState.isError &&
    (state.isRemoteUninitialized || state.isLoadingFromRemote)
  ) {
    return loadingAsyncStateFactory();
  }

  return {
    ...recipeState,
    data,
    currentData,
  };
}

/**
 * Returns all recipes from the local registry, and triggers a remote refresh.
 *
 * Safe to include multiple times in the React tree, because it's connected to the Redux store.
 */
export function useAllRecipes(): UseCachedQueryResult<RecipeDefinition[]> {
  const dispatch = useDispatch();
  const refetch = useCallback(
    () => dispatch(recipesActions.syncRemoteRecipes()),
    [dispatch]
  );
  const state = useSelector(selectAllRecipes);

  // First load from local database
  useEffect(() => {
    if (state.isCacheUninitialized) {
      dispatch(recipesActions.loadRecipesFromCache());
    }
  }, [dispatch, state.isCacheUninitialized]);

  // Load from remote data source once the local data has been loaded
  useEffect(() => {
    if (
      state.isRemoteUninitialized &&
      !state.isLoadingFromCache &&
      !state.isCacheUninitialized
    ) {
      dispatch(recipesActions.syncRemoteRecipes());
    }
  }, [
    dispatch,
    state.isLoadingFromCache,
    state.isCacheUninitialized,
    state.isRemoteUninitialized,
  ]);

  return { ...state, refetch };
}
