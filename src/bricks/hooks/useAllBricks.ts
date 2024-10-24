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

import brickRegistry, { type TypedBrickMap } from "@/bricks/registry";
import { isEmpty } from "lodash";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { useState } from "react";
import { useAsyncEffect } from "use-async-effect";

const subscribe = (callback: () => void) => {
  brickRegistry.onChange.add(callback);

  return () => {
    brickRegistry.onChange.remove(callback);
  };
};

/**
 * Load the TypedBlockMap from the block registry, and listen for changes in the registry.
 */
// XXX: refactor to use useAsyncExternalStore and return an AsyncState. Callsites will need to explicitly handle
// loading/error states (e.g., via fallback value)
function useAllBricks(): {
  allBricks: TypedBrickMap;
  isLoading: boolean;
} {
  // Use useAsyncEffect and useState to handle the promise. Can't use useAsyncState because it requires that
  // the data is serializable because it uses RTK.
  const [allTyped, setAllTyped] = useState<TypedBrickMap>(
    new Map() as TypedBrickMap,
  );

  const allTypedPromise = useSyncExternalStore(
    subscribe,
    brickRegistry.allTyped.bind(brickRegistry),
  );

  useAsyncEffect(
    async (isMounted) => {
      try {
        const allTyped = await allTypedPromise;
        if (isMounted()) {
          setAllTyped(allTyped);
        }
      } catch (error) {
        console.debug("Error loading bricks", error);
      }
    },
    [allTypedPromise, setAllTyped],
  );

  return {
    allBricks: allTyped,
    isLoading: isEmpty(allTyped),
  };
}

export default useAllBricks;
