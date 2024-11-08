/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { type ModDefinition } from "@/types/modDefinitionTypes";
import { useDispatch, useSelector } from "react-redux";
import { selectModDefinitionsAsyncState } from "./modDefinitionsSelectors";
import { useCallback } from "react";
import {
  modDefinitionsActions,
  type ModDefinitionsDispatch,
} from "./modDefinitionsSlice";
import { type RegistryId } from "@/types/registryTypes";
import {
  type AsyncState,
  type FetchableAsyncState,
  type UseCachedQueryResult,
} from "@/types/sliceTypes";
import useMemoCompare from "../hooks/useMemoCompare";
import deepEquals from "fast-deep-equal";
import { loadingAsyncStateFactory } from "../utils/asyncStateUtils";
import useMergeAsyncState from "../hooks/useMergeAsyncState";
import pluralize from "../utils/pluralize";
import { type Nullishable } from "../utils/nullishUtils";
import useAsyncEffect from "use-async-effect";

/**
 * Lookup a mod definition from the registry by ID, or null if it doesn't exist.
 *
 * NOTE: uses useAllModDefinitions which first checks the local cache. So value may change from `null` to `mod
 * definition` after the remote fetch completes.
 *
 * If you want to return an error state if the mod definition doesn't exist, use useRequiredModDefinitions instead.
 *
 * @param id the registry id of the mod definition
 * @see useRequiredModDefinitions
 * @see useAllModDefinitions
 */
export function useOptionalModDefinition(
  id: Nullishable<RegistryId>,
): FetchableAsyncState<ModDefinition> {
  const state = useAllModDefinitions();

  const findModDefinition = useCallback(
    (modDefinitions: ModDefinition[]) =>
      modDefinitions.find((x) => x.metadata.id === id),
    [id],
  );

  const modDefinitionState = useMergeAsyncState(state, findModDefinition);

  // Avoid reference change when useAllModDefinitions switches from cache to remote fetch
  const data = useMemoCompare<ModDefinition | undefined>(
    modDefinitionState.data,
    deepEquals,
  );
  const currentData = useMemoCompare<ModDefinition | undefined>(
    modDefinitionState.data,
    deepEquals,
    [id],
  );

  return {
    ...modDefinitionState,
    data,
    currentData,
  };
}

/**
 * Lookup mod definitions from the registry by ID, or return an error state if any don't exist.
 *
 * Only returns an error state if the remote fetch fails. If any mod is not found in the local cache, it will wait
 * until the remote fetch completes before returning an error state.
 *
 * @param ids the registry ids of the mod definitions
 * @see useOptionalModDefinition
 * @see useAllModDefinitions
 */
export function useRequiredModDefinitions(
  ids: RegistryId[],
): AsyncState<ModDefinition[]> {
  const state = useAllModDefinitions();

  const modDefinitionState = useMergeAsyncState(
    state,
    (mods: ModDefinition[]) => {
      const matches = mods.filter((x) => ids.includes(x.metadata.id));

      if (ids.length !== matches.length) {
        const missingIds = ids.filter(
          (x) => !matches.some((mod) => mod.metadata.id === x),
        );
        throw new Error(
          `Mod ${pluralize(
            missingIds.length,
            "definition",
          )} not found: ${missingIds.join(", ")}`,
        );
      }

      return matches;
    },
  );

  // Avoid reference change when useAllModDefinitions switches from cache to remote fetch
  const data = useMemoCompare<ModDefinition[] | undefined>(
    modDefinitionState.data,
    deepEquals,
  );
  const currentData = useMemoCompare<ModDefinition[] | undefined>(
    modDefinitionState.currentData,
    deepEquals,
    ids,
  );

  // Don't error until the lookup fails against the remote data
  if (
    modDefinitionState.isError &&
    (state.isRemoteUninitialized || state.isLoadingFromRemote)
  ) {
    return loadingAsyncStateFactory();
  }

  return {
    ...modDefinitionState,
    data,
    currentData,
  };
}

/**
 * Returns all mod definitions from the local registry, and triggers a remote refresh.
 *
 * Safe to include multiple times in the React tree, because it's connected to the Redux store.
 */
export function useAllModDefinitions(): UseCachedQueryResult<ModDefinition[]> {
  const dispatch = useDispatch<ModDefinitionsDispatch>();
  const state = useSelector(selectModDefinitionsAsyncState);

  const refetch = useCallback(async () => {
    await dispatch(modDefinitionsActions.syncRemoteModDefinitions());
  }, [dispatch]);

  // First load from local database
  useAsyncEffect(async () => {
    await dispatch(modDefinitionsActions.loadModDefinitionsFromCache());
  }, [dispatch]);

  // Load from remote data source once the local data has been loaded
  useAsyncEffect(async () => {
    if (
      state.isRemoteUninitialized &&
      !state.isLoadingFromCache &&
      !state.isCacheUninitialized
    ) {
      await dispatch(modDefinitionsActions.syncRemoteModDefinitions());
    }
  }, [
    dispatch,
    state.isLoadingFromCache,
    state.isCacheUninitialized,
    state.isRemoteUninitialized,
  ]);

  return { ...state, refetch };
}
