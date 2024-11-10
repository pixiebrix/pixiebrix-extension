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

import { useSelector } from "react-redux";
import {
  selectCurrentModId,
  selectGetModComponentFormStatesForMod,
} from "@/pageEditor/store/editor/editorSelectors";
import { useMemo } from "react";
import useAsyncState from "@/hooks/useAsyncState";
import SearchIndexVisitor, {
  type IndexedItem,
} from "@/pageEditor/find/searchIndexVisitor";
import Fuse, { type FuseResult } from "fuse.js";
import type { SetRequired } from "type-fest";
import useEnsureFormStates from "@/pageEditor/hooks/useEnsureFormStates";
import { assertNotNullish } from "@/utils/nullishUtils";

type FindResults = Array<SetRequired<FuseResult<IndexedItem>, "matches">>;

/**
 * Hook to find query within the current mod.
 */
function useFind(
  query: string,
): Array<SetRequired<FuseResult<IndexedItem>, "matches">> {
  // Find/search depends on all mod components having form states with instanceIds assigned
  useEnsureFormStates();

  const currentModId = useSelector(selectCurrentModId);
  assertNotNullish(currentModId, "Expected currentModId");

  const getModComponentFormStatesForMod = useSelector(
    selectGetModComponentFormStatesForMod,
  );

  const modComponentFormStates = getModComponentFormStatesForMod(currentModId);

  const fuse = useAsyncState(async () => {
    const items = await SearchIndexVisitor.collectItems(modComponentFormStates);

    return new Fuse(items, {
      // https://www.fusejs.io/api/options.html#includematches
      includeMatches: true,
      // XXX: consider including all matches
      // https://www.fusejs.io/api/options.html#findallmatches
      findAllMatches: false,
      // Search the whole string: https://www.fusejs.io/api/options.html#ignorelocation
      ignoreLocation: true,
      threshold: 0.2,
      distance: Number.MAX_SAFE_INTEGER,
      keys: [
        "data.label",
        "data.value",
        "data.comments",
        "data.brick.name",
        // Put brick id last - typically if someone is search it, it's because they're searching by the
        // exact brick id
        "data.brick.id",
      ],
    });
  }, [modComponentFormStates]);

  // `matches` will be present because `includeMatches: true` in the Fuse constructor
  return useMemo(
    () => fuse.data?.search(query) ?? [],
    [fuse.data, query],
  ) as FindResults;
}

export default useFind;
