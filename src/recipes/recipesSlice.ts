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

export const initialState: RecipesState = Object.freeze({
  // Standard async state
  data: undefined,
  currentData: undefined,
  isLoading: false,
  isFetching: false,
  isUninitialized: true,
  isError: false,
  isSuccess: false,
  error: undefined,

  // Additional cache async state
  isFetchingFromCache: false,
  isCacheUninitialized: true,
});

/**
 * Load recipes from cache. DOES NOT set isLoading/isFetching state.
 */
const loadRecipesFromCache = createAsyncThunk<
  void,
  void,
  { state: RecipesRootState }
>("recipes/loadFromCache", async (arg, { dispatch, getState }) => {
  if (getState().recipes.isFetchingFromCache) {
    throw new Error("Aborted due to query being already in progress");
  }

  dispatch(recipesSlice.actions.startLoadingFromCache());

  try {
    const recipes = await recipeRegistry.all();
    dispatch(recipesSlice.actions.setRecipesFromCache(recipes));
  } catch (error) {
    dispatch(recipesSlice.actions.setCacheError(error));
  }
});

export const refreshRecipes = createAsyncThunk<
  void,
  void,
  { state: RecipesRootState }
>("recipes/refresh", async (arg, { dispatch, getState }) => {
  if (getState().recipes.isFetching) {
    throw new Error("Aborted due to query being already in progress");
  }

  dispatch(recipesSlice.actions.startFetching());

  try {
    await syncRemotePackages();
  } catch (error) {
    const serializedError = serializeError(error, { useToJSON: false });
    dispatch(recipesSlice.actions.setError(serializedError));
    return;
  }

  const recipes = await recipeRegistry.all();
  dispatch(recipesSlice.actions.setRecipes(recipes));
});

export const recipesSlice = createSlice({
  name: "recipes",
  initialState,
  reducers: {
    startLoadingFromCache(state) {
      state.isFetchingFromCache = true;
    },
    setRecipesFromCache(state, action: PayloadAction<RecipeDefinition[]>) {
      state.isSuccess = true;
      state.data = action.payload;
      state.currentData = action.payload;
      state.isUninitialized = false;
      state.isError = false;
      state.isLoading = false;

      state.isFetchingFromCache = false;
      state.isCacheUninitialized = false;
    },
    setCacheError(state, action: PayloadAction<unknown>) {
      // If there's an error loading from cache, don't update state, as will make the remote fetch
      state.isCacheUninitialized = true;
      state.isFetchingFromCache = false;
    },
    startFetching(state) {
      state.isUninitialized = false;
      state.isFetching = true;
      if (state.isUninitialized) {
        state.isLoading = true;
      }
    },
    setRecipes(state, action: PayloadAction<RecipeDefinition[]>) {
      state.isSuccess = true;
      state.data = action.payload;
      state.currentData = action.payload;
      state.error = undefined;
      state.isError = false;
      state.isFetching = false;
      state.isLoading = false;
    },
    setError(state, action) {
      state.isError = true;
      state.error = action.payload;
      state.data = undefined;
      state.currentData = undefined;
      state.isSuccess = false;
      state.isFetching = false;
      state.isLoading = false;
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialState);
  },
});

export const recipesActions = {
  ...recipesSlice.actions,
  loadRecipesFromCache,
  refreshRecipes,
};
