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

import { useCallback, useSyncExternalStore } from "react";
import type { UUID } from "@/types/stringTypes";
import { type RegisteredAction } from "@/contentScript/textSelectionMenu/ActionRegistry";
import type ActionRegistry from "@/contentScript/textSelectionMenu/ActionRegistry";

/**
 * React hook to receive action updates from the toolbar registry.
 * @param registry the action registry to watch
 */
function useActionRegistry(
  registry: ActionRegistry,
): Map<UUID, RegisteredAction> {
  const subscribe = useCallback(
    (callback: () => void) => {
      registry.onChange.add(callback);
      return () => {
        registry.onChange.remove(callback);
      };
    },
    [registry],
  );

  // `getSnapshot` must return a consistent reference, so just pass back the actions map directly
  const getSnapshot = useCallback(() => registry.actions, [registry]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

export default useActionRegistry;
