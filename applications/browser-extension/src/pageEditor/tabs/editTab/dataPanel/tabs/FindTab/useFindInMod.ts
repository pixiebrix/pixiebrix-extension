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
  selectActiveModId,
  selectGetModComponentFormStatesForMod,
} from "@/pageEditor/store/editor/editorSelectors";
import { useMemo } from "react";
import useAsyncState from "@/hooks/useAsyncState";
import SearchIndexVisitor from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/searchIndexVisitor";
import Fuse, { type FuseResult } from "fuse.js";
import type { SetRequired } from "type-fest";
import useEnsureFormStates from "@/pageEditor/hooks/useEnsureFormStates";
import { assertNotNullish } from "@/utils/nullishUtils";
import type { IndexedItem } from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/findTypes";

type FindResults = Array<SetRequired<FuseResult<IndexedItem>, "matches">>;

/**
 * Hook to find query within the current mod.
 */
function useFindInMod(
  query: string,
): Array<SetRequired<FuseResult<IndexedItem>, "matches">> {
  // Find/search depends on all mod components having form states with instanceIds assigned
  useEnsureFormStates();

  const activeModId = useSelector(selectActiveModId);
  assertNotNullish(activeModId, "Expected activeModId");

  const getModComponentFormStatesForMod = useSelector(
    selectGetModComponentFormStatesForMod,
  );

  const modComponentFormStates = getModComponentFormStatesForMod(activeModId);

  const fuse = useAsyncState(async () => {
    const items = await SearchIndexVisitor.collectItems(modComponentFormStates);

    return new Fuse(items, {
      // https://www.fusejs.io/api/options.html#includematches
      includeMatches: true,
      // Make the default explicit. We only show the first match in the UI so additional matches would be ignored
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
        // Put brick id last - typically if someone is searching for brick id, it's because they're searching by the
        // exact brick id
        "data.brick.id",
      ],
    });
  }, [modComponentFormStates]);

  return useMemo(
    // `matches` will be present because `includeMatches: true` in the Fuse constructor
    () => (fuse.data?.search(query) ?? []) as FindResults,
    [fuse.data, query],
  );
}

export default useFindInMod;
