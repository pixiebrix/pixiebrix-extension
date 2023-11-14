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
import { useEffect, useRef } from "react";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import useDebouncedEffect from "@/hooks/useDebouncedEffect";

/**
 * QuickBar Hook for automatically updating QuickBar actions when the search query or root action changes.
 *
 * `quickBarRegistry` automatically manages cancelling any pending generators on calls to `generateActions`.
 *
 * @see quickBarRegistry
 */
function useActionGenerators(): void {
  const initialMountRef = useRef(true);

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
    // eslint-disable-next-line -- generate immediately on mount, and when root changes (because some actions only show when their parent is active)
    [currentRootActionId]
  );

  useDebouncedEffect(
    { searchQuery, currentRootActionId },
    async (values) => {
      // Avoid duplicate run on initial mount. Run via useEffect above instead.
      if (initialMountRef.current) {
        initialMountRef.current = false;
        return;
      }

      await quickBarRegistry.generateActions({
        query: values.searchQuery,
        rootActionId: values.currentRootActionId,
      });
    },
    {
      delayMillis: 250,
      // Avoid unnecessary API calls
      maxWaitMillis: 1500,
      leading: false,
      trailing: true,
      // Only check searchQuery, because changes in currentRootActionId are handled by the useEffect above
      equalityFn: (lhs, rhs) => lhs.searchQuery === rhs.searchQuery,
    }
  );
}

export default useActionGenerators;
