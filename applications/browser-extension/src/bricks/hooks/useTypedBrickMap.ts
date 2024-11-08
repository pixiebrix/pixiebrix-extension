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

import brickRegistry, { type TypedBrickMap } from "../registry";
import type { AsyncState } from "../../types/sliceTypes";
import useAsyncExternalStore from "../../hooks/useAsyncExternalStore";

function subscribe(callback: () => void) {
  brickRegistry.onChange.add(callback);

  return () => {
    brickRegistry.onChange.remove(callback);
  };
}

// Define module-level snapshot to eliminate possibility of brickRegistry.allTyped being shared across
// useSyncExternalStore calls.
async function snapshot() {
  return brickRegistry.allTyped();
}

/**
 * Load the useTypedBrickMap from the brickRegistry, and listen for changes in the registry.
 */
function useTypedBrickMap(): AsyncState<TypedBrickMap> {
  return useAsyncExternalStore(subscribe, snapshot);
}

export default useTypedBrickMap;
