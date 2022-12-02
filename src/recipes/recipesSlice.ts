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

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { serializeError } from "serialize-error";
import { RecipesRootState, RecipesState } from "./recipesTypes";
import registry from "./registry";
import { StorageInterface } from "@/store/StorageInterface";
import { localStorage } from "redux-persist-webextension-storage";

export const initialState: RecipesState = Object.freeze({
  recipes: [],

  isFetchingFromCache: false,
  isCacheUninitialized: true,

  isLoading: false,
  isFetching: false,
  isUninitialized: true,

  error: undefined,
});

const loadRecipesFromCache = createAsyncThunk<
  void,
  void,
  { state: RecipesRootState }
>("recipes/loadFromCache", async (arg, { dispatch, getState }) => {
  if (getState().recipes.isFetchingFromCache) {
    throw new Error("Aborted due to query being already in progress");
  }

  dispatch(recipesSlice.actions.startLoadingFromCache());

  const recipes = await registry.all();

  dispatch(recipesSlice.actions.setRecipesFromCache(recipes));
});

export const refreshRecipes = createAsyncThunk<
  void,
  void,
  { state: RecipesRootState }
>("recipes/refresh", async (arg, { dispatch, getState }) => {
  if (getState().recipes.isFetching) {
    throw new Error("Aborted due to query being already in progress");
  }

  dispatch(recipesSlice.actions.startLoading());

  try {
    await registry.fetch();
  } catch (error) {
    const serializedError = serializeError(error, { useToJSON: false });
    dispatch(recipesSlice.actions.setError(serializedError));
    return;
  }

  const recipes = await registry.all();
  dispatch(recipesSlice.actions.setRecipes(recipes));
});

export const recipesSlice = createSlice({
  name: "recipes",
  initialState,
  reducers: {
    startLoadingFromCache(state) {
      state.isFetchingFromCache = true;
    },
    setRecipesFromCache(state, action) {
      state.recipes = action.payload;
      state.isFetchingFromCache = false;
      state.isCacheUninitialized = false;
    },
    startLoading(state) {
      state.isFetching = true;
      if (state.isUninitialized) {
        state.isLoading = true;
      }
    },
    setRecipes(state, action) {
      state.recipes = action.payload;
      state.isFetching = false;
      state.isLoading = false;
      state.isUninitialized = false;
      state.error = undefined;
    },
    setError(state, action) {
      state.error = action.payload;
      state.isFetching = false;
      state.isLoading = false;
    },
  },
});

export const recipesActions = {
  ...recipesSlice.actions,
  loadRecipesFromCache,
  refreshRecipes,
};

// Shadowing this type in order to export it properly
const local: StorageInterface = localStorage;

export const persistRecipesConfig = {
  key: "recipes",
  storage: local,
};
