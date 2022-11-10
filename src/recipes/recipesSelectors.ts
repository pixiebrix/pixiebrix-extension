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

import { RecipeDefinition } from "@/types/definitions";
import { RecipesRootState } from "./recipesTypes";

export type StateSelector<T> = {
  /**
   * The value, or `undefined` if the state is loading or there was an error computing the state
   */
  data: T | undefined;

  /**
   * When true, indicates that the query is currently fetching, but might have data from an earlier request. This will be true for both the first request fired off, as well as subsequent requests.
   */
  isFetching: boolean;

  /**
   * When true, indicates that the query is currently loading for the first time, and has no data yet. This will be true for the first request fired off, but not for subsequent requests.
   */
  isLoading: boolean;

  /**
   * When true, indicates that the query has not started yet.
   */
  isUninitialized: boolean;

  /**
   * The error, if any
   */
  error: unknown;
};

export function selectAllRecipes({
  recipes,
}: RecipesRootState): StateSelector<RecipeDefinition[]> {
  return {
    data: recipes.recipes,
    isFetching: recipes.isFetching,
    isLoading: recipes.isLoading,
    isUninitialized: recipes.isUninitialized,
    error: recipes.error,
  };
}
