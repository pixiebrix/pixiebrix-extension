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
import { useState } from "react";
import { useAsyncEffect } from "use-async-effect";

/**
 * Load the TypedBlockMap from the block registry. Refreshes on mount.
 */
function useAllBlocks(): {
  allBlocks: TypedBlockMap;
  isLoading: boolean;
} {
  const [allBlocks, setAllBlocks] = useState<TypedBlockMap>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useAsyncEffect(async (isMounted) => {
    const blocks = await blockRegistry.allTyped();
    if (isMounted()) {
      setAllBlocks(blocks);
      setIsLoading(false);
    }
  }, []);

  return {
    allBlocks,
    isLoading,
  };
}

export default useAllBlocks;
