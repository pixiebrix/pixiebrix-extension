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
import { selectCurrentModId } from "@/pageEditor/store/editor/editorSelectors";
import { useMemo } from "react";
import useAsyncState from "@/hooks/useAsyncState";
import { selectGetDraftFormStatesPromiseForModId } from "@/pageEditor/starterBricks/adapter";
import SearchIndexVisitor, {
  type IndexedItem,
} from "@/pageEditor/find/searchIndexVisitor";
import Fuse, { type FuseResult } from "fuse.js";

function useFind(query: string): Array<FuseResult<IndexedItem>> {
  const currentModId = useSelector(selectCurrentModId);
  const getDraftFormStatesPromiseForModId = useSelector(
    selectGetDraftFormStatesPromiseForModId,
  );

  const fuse = useAsyncState(async () => {
    const formStates = currentModId
      ? await getDraftFormStatesPromiseForModId(currentModId)
      : [];
    const items = await SearchIndexVisitor.collectItems(formStates);

    return new Fuse(items, {
      keys: [
        "data.label",
        "data.value",
        "data.comments",
        "data.brick.name",
        "data.brick.id",
      ],
    });
  }, [currentModId, getDraftFormStatesPromiseForModId]);

  return useMemo(() => fuse.data?.search(query) ?? [], [fuse.data, query]);
}

export default useFind;
