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

import blockRegistry, { TypedBlockMap } from "@/blocks/registry";
import { useAsyncState } from "@/hooks/common";
import { isEmpty } from "lodash";
import { useEffect, useMemo } from "react";
import { RegistryChangeListener } from "@/baseRegistry";

let allBlocksCached: TypedBlockMap = new Map();

/**
 * Load the TypedBlockMap from the block registry. Refreshes on mount.
 */
function useAllBlocks(): {
  allBlocks: TypedBlockMap;
  isLoading: boolean;
} {
  // Note: we don't want to return the loading flag from the async state here,
  // because outside this hook, we only care about when the cache is empty
  const [allBlocks, , error, reload] = useAsyncState<TypedBlockMap>(
    async () => {
      allBlocksCached = await blockRegistry.allTyped();
      return allBlocksCached;
    },
    [],
    allBlocksCached
  );

  const registryListener = useMemo<RegistryChangeListener>(
    () => ({
      onCacheChanged() {
        void reload();
      },
    }),
    [reload]
  );

  useEffect(() => {
    blockRegistry.addListener(registryListener);

    return () => {
      blockRegistry.removeListener(registryListener);
    };
  }, [registryListener, reload]);

  return {
    allBlocks,
    isLoading: isEmpty(allBlocksCached) && !error,
  };
}

export default useAllBlocks;
