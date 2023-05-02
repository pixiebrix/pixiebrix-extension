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

import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { serializeError } from "serialize-error";
import { type RecipesRootState, type RecipesState } from "./recipesTypes";
import recipeRegistry from "./registry";
import { syncRemotePackages } from "@/baseRegistry";
import { revertAll } from "@/store/commonActions";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { setErrorOnState, setValueOnState } from "@/utils/asyncStateUtils";

export const initialState: RecipesState = Object.freeze({
  // Standard async state
  data: undefined,
  // Current data will always match data because the slice doesn't consider any input arguments
  currentData: undefined,
  isLoading: false,
  isFetching: false,
  isUninitialized: true,
  isError: false,
  isSuccess: false,
  error: undefined,

  // Additional cache async state
  isCacheUninitialized: true,
  isLoadingFromCache: false,

  isRemoteUninitialized: true,
  isFetchingFromRemote: false,
  isLoadingFromRemote: false,
});

/**
 * Load recipes from the local database.
 */
const loadRecipesFromCache = createAsyncThunk<
  void,
  void,
  { state: RecipesRootState }
>("recipes/loadFromCache", async (arg, { dispatch, getState }) => {
  if (!getState().recipes.isCacheUninitialized) {
    throw new Error("Already loaded recipes from cache");
  }

  try {
    dispatch(recipesSlice.actions.startFetchingFromCache());
    const recipes = await recipeRegistry.all();
    dispatch(recipesSlice.actions.setRecipesFromCache(recipes));
  } catch {
    dispatch(recipesSlice.actions.setCacheError());
  }
});

export const syncRemoteRecipes = createAsyncThunk<
  void,
  void,
  { state: RecipesRootState }
>("recipes/refresh", async (arg, { dispatch, getState }) => {
  if (getState().recipes.isFetchingFromRemote) {
    throw new Error("Already fetching recipes from server");
  }

  try {
    dispatch(recipesSlice.actions.startFetchingFromRemote());
    await syncRemotePackages();
    const recipes = await recipeRegistry.all();
    dispatch(recipesSlice.actions.setRecipes(recipes));
  } catch (error) {
    // Serialize because stored in Redux
    const serializedError = serializeError(error, { useToJSON: false });
    dispatch(recipesSlice.actions.setError(serializedError));
  }
});

export const recipesSlice = createSlice({
  name: "recipes",
  initialState,
  reducers: {
    startFetchingFromCache(state) {
      state.isUninitialized = false;
      state.isLoading = true;
      state.isFetching = true;
      state.isCacheUninitialized = false;
      state.isLoadingFromCache = true;
    },
    setRecipesFromCache(state, action: PayloadAction<RecipeDefinition[]>) {
      // NOTE: there will be a flash of `isFetching: false` before the remote fetch starts
      setValueOnState(state, action.payload);
      state.isLoadingFromCache = false;
    },
    setCacheError(state) {
      // Don't flash on error on cache failure. The useAllRecipes hook will immediately trigger a remote fetch
      state.isLoadingFromCache = false;
    },
    startFetchingFromRemote(state) {
      if (state.isRemoteUninitialized) {
        state.isLoadingFromRemote = true;
      }

      // Don't reset currentData, because the recipes slice doesn't take any inputs arguments
      state.isRemoteUninitialized = false;
      state.isFetching = true;
      state.isFetchingFromRemote = true;
    },
    setRecipes(state, action: PayloadAction<RecipeDefinition[]>) {
      setValueOnState(state, action.payload);
      state.isFetchingFromRemote = false;
      state.isLoadingFromRemote = false;
    },
    setError(state, action) {
      setErrorOnState(state, action.payload);
      state.isFetchingFromRemote = false;
      state.isLoadingFromRemote = false;
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialState);
  },
});

export const recipesActions = {
  ...recipesSlice.actions,
  loadRecipesFromCache,
  syncRemoteRecipes,
};
