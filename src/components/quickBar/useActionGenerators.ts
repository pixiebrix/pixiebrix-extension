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

import { useKBar } from "kbar";
import { useEffect, useMemo } from "react";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import useDebouncedEffect from "@/hooks/useDebouncedEffect";

let queryPromise: WeakRef<Promise<void>> | null = null;

function useActionGenerators(): void {
  const { searchQuery, currentRootActionId } = useKBar(
    ({ searchQuery, currentRootActionId }) => ({
      searchQuery,
      currentRootActionId,
    })
  );

  useEffect(
    () => {
      void quickBarRegistry.generateActions({
        query: searchQuery,
        rootActionId: currentRootActionId,
      });
    },
    // eslint-disable-next-line -- fire immediately when root changes
    [currentRootActionId]
  );

  const searchArgs = useMemo(
    () => ({ searchQuery, currentRootActionId }),
    [searchQuery, currentRootActionId]
  );

  useDebouncedEffect(
    searchArgs,
    (values) => {
      const promise = queryPromise?.deref() ?? Promise.resolve();
      // Chain requests to avoid old requests overwriting newer requests
      // In the future, we'll want to set a nonce on the generator run, and ignore actions for the old nonce. However,
      // currently there's no great way to pass that through to the AddQuickBarAction brick
      queryPromise = new WeakRef<Promise<void>>(
        // eslint-disable-next-line promise/prefer-await-to-then -- creating a new promise
        promise.then(async () =>
          quickBarRegistry.generateActions({
            query: values.searchQuery,
            rootActionId: values.currentRootActionId,
          })
        )
      );
    },
    150,
    750
  );
}

export default useActionGenerators;
