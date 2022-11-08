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
import { RecipesRootState, RecipesState } from "./recipesTypes";
import registry from "./registry";

const initialState: RecipesState = {
  recipes: [],
  isLoading: false,
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
  { backgroundRefresh?: boolean },
  { state: RecipesRootState }
>("recipes/refresh", async (arg, { dispatch, getState }) => {
  if (getState().recipes.isLoading) {
    return;
  }

  if (!arg?.backgroundRefresh) {
    dispatch(recipesSlice.actions.setLoading(true));
  }

  await registry.fetch();

  const recipes = await registry.all();
  dispatch(recipesSlice.actions.setRecipes(recipes));

  if (!arg?.backgroundRefresh) {
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
    },
  },
});

export const recipesActions = {
  ...recipesSlice.actions,
  loadRecipesFromCache,
  refreshRecipes,
};
