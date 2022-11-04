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

import { Registry, RegistryItem } from "@/baseRegistry";
import { RegistryId } from "@/core";
import { useAsyncState } from "./common";
import recipesRegistry from "@/recipes/registry";
import { RecipeDefinition } from "@/types/definitions";

export type RegistryRequestState<T> = {
  /**
   * The value, or `undefined` if the state is loading or there was an error computing the state
   */
  data: T | undefined;

  /**
   * True if the async state is loading
   */
  isLoading: boolean;

  /**
   * Error or undefined if there was no error computing the state
   */
  error: unknown;

  /**
   * Method to re-calculate the value. Does not set `isLoading` flag
   */
  recalculate: () => Promise<void>;
};

/**
 * Lookup an item from a registry by ID. Converts async call to a React stateful request.
 */
export function useRegistry<Id extends RegistryId, T extends RegistryItem<Id>>(
  registry: Registry<Id, T>,
  id: Id
): RegistryRequestState<T> {
  const [data, isLoading, error, recalculate] = useAsyncState<T>(
    async () => (id == null ? undefined : registry.lookup(id)),
    [registry, id]
  );
  return { data, isLoading, error, recalculate };
}

/**
 * Lookup a recipe from the registry by ID
 */
export function useRecipe(
  id: RegistryId
): RegistryRequestState<RecipeDefinition> {
  return useRegistry(recipesRegistry, id);
}

/**
 * Pulls all recipes from the registry
 * @returns
 */
export function useAllRecipes(): RegistryRequestState<RecipeDefinition[]> {
  const [data, isLoading, error, recalculate] = useAsyncState(
    async () => recipesRegistry.all(),
    []
  );
  return { data, isLoading, error, recalculate };
}
