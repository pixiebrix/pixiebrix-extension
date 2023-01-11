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

import blockRegistry, { type TypedBlockMap } from "@/blocks/registry";
import { isEmpty } from "lodash";
import { useSyncExternalStore } from "use-sync-external-store/shim";

/**
 * Load the TypedBlockMap from the block registry. Refreshes on mount.
 */
function useAllBlocks(): {
  allBlocks: TypedBlockMap;
  isLoading: boolean;
} {
  const allBlocks = useSyncExternalStore(
    blockRegistry.subscribeToAllTyped,
    blockRegistry.allTypedSnapshot
  );

  return {
    allBlocks,
    isLoading: isEmpty(allBlocks),
  };
}

export default useAllBlocks;
