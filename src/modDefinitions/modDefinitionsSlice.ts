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

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  type ModDefinitionsRootState,
  type ModDefinitionsState,
} from "./modDefinitionsTypes";
import modDefinitionRegistry from "./registry";
import { syncRemotePackages } from "@/registry/memoryRegistry";
import { revertAll } from "@/store/commonActions";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { setErrorOnState, setValueOnState } from "@/utils/asyncStateUtils";

/** @internal */
export const initialState: ModDefinitionsState = Object.freeze({
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
 * Load mod definitions from the local database.
 */
const loadModDefinitionsFromCache = createAsyncThunk<
  ModDefinition[],
  void,
  { state: ModDefinitionsRootState }
>(
  "modDefinitions/loadFromCache",
  async () => {
    const registryModDefinitions = await modDefinitionRegistry.all();
    // Remove the top level registry item id to satisfy types properly
    return registryModDefinitions.map((x) => {
      const { id, ...rest } = x;
      return rest;
    });
  },
  {
    condition(_, { getState }) {
      const {
        isCacheUninitialized,
        isLoadingFromCache,
        isLoadingFromRemote,
        isFetchingFromRemote,
      } = getState().modDefinitions;

      // Never load if the cache is already initialized
      // Never load if already loading from cache or syncing with remote to prevent race conditions
      return (
        isCacheUninitialized &&
        !isLoadingFromCache &&
        !isLoadingFromRemote &&
        !isFetchingFromRemote
      );
    },
  },
);

export const syncRemoteModDefinitions = createAsyncThunk<
  ModDefinition[],
  void,
  { state: ModDefinitionsRootState }
>(
  "modDefinitions/refresh",
  async () => {
    await syncRemotePackages();
    const registryModDefinitions = await modDefinitionRegistry.all();
    // Remove the top level registry item id to satisfy types properly
    return registryModDefinitions.map((x) => {
      const { id, ...rest } = x;
      return rest;
    });
  },
  {
    condition(_, { getState }) {
      const { isLoadingFromRemote, isFetchingFromRemote, isLoadingFromCache } =
        getState().modDefinitions;

      // Never load if already syncing with remote or loading from cache to prevent race conditions
      return (
        !isLoadingFromRemote && !isFetchingFromRemote && !isLoadingFromCache
      );
    },
  },
);

export const modDefinitionsSlice = createSlice({
  name: "modDefinitions",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(revertAll, () => initialState)
      .addCase(loadModDefinitionsFromCache.pending, (state) => {
        state.isUninitialized = false;
        state.isLoading = true;
        state.isFetching = true;
        state.isCacheUninitialized = false;
        state.isLoadingFromCache = true;
      })
      .addCase(loadModDefinitionsFromCache.fulfilled, (state, action) => {
        setValueOnState(state, action.payload);
        state.isLoadingFromCache = false;
      })
      .addCase(loadModDefinitionsFromCache.rejected, (state) => {
        // Don't flash on error on cache failure. The useAllModDefinitions hook will immediately trigger a remote fetch
        state.isLoadingFromCache = false;
      })
      .addCase(syncRemoteModDefinitions.pending, (state) => {
        if (state.isRemoteUninitialized) {
          state.isLoadingFromRemote = true;
        }

        // Don't reset currentData, because the mod definitions slice doesn't take any inputs arguments
        state.isRemoteUninitialized = false;
        state.isFetching = true;
        state.isFetchingFromRemote = true;
      })
      .addCase(syncRemoteModDefinitions.fulfilled, (state, action) => {
        setValueOnState(state, action.payload);
        state.isFetchingFromRemote = false;
        state.isLoadingFromRemote = false;
      })
      .addCase(syncRemoteModDefinitions.rejected, (state, action) => {
        setErrorOnState(state, action.error);
        state.isFetchingFromRemote = false;
        state.isLoadingFromRemote = false;
      });
  },
});

export const modDefinitionsActions = {
  ...modDefinitionsSlice.actions,
  loadModDefinitionsFromCache,
  syncRemoteModDefinitions,
};
