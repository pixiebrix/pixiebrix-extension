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

const initialState: RecipesState = {
  recipes: [],
  isLoading: false,
  error: undefined,
};

const loadRecipesFromCache = createAsyncThunk(
  "recipes/loadFromCache",
  async (arg, { dispatch }) => {
    const recipes = await registry.all();
    dispatch(recipesSlice.actions.setRecipes(recipes));
  }
);

export const refreshRecipes = createAsyncThunk<
  void,
  void | { backgroundRefresh?: boolean },
  { state: RecipesRootState }
>("recipes/refresh", async (arg, { dispatch, getState }) => {
  if (getState().recipes.isLoading) {
    return;
  }

  if (!(arg as any)?.backgroundRefresh) {
    dispatch(recipesSlice.actions.setLoading(true));
  }

  try {
    await registry.fetch();
  } catch (error) {
    const serializedError = serializeError(error, { useToJSON: false });
    dispatch(recipesSlice.actions.setError(serializedError));
    return;
  }

  const recipes = await registry.all();
  dispatch(recipesSlice.actions.setRecipes(recipes));

  if (!(arg as any)?.backgroundRefresh) {
    dispatch(recipesSlice.actions.setLoading(false));
  }
});

export const recipesSlice = createSlice({
  name: "recipes",
  initialState,
  reducers: {
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setRecipes(state, action) {
      state.recipes = action.payload;
      state.error = undefined;
    },
    setError(state, action) {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const recipesActions = {
  ...recipesSlice.actions,
  loadRecipesFromCache,
  refreshRecipes,
};
