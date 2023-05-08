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

import { type IBlock } from "@/types/blockTypes";
import { useMemo } from "react";
import { isEmpty, sortBy } from "lodash";
import Fuse from "fuse.js";
import { isNullOrBlank } from "@/utils";
import {
  type BlockOption,
  type BlockResult,
} from "@/components/addBlockModal/addBlockModalTypes";
import { TAG_ALL } from "@/components/addBlockModal/addBlockModalConstants";

function makeBlockOption(block: IBlock): BlockOption {
  return {
    value: block.id,
    label: block.name,
    blockResult: block as BlockResult,
  };
}

const EMPTY_BLOCK_RESULTS: BlockOption[] = [];

function useBlockSearch(
  blocks: IBlock[],
  taggedBrickIds: Record<string, Set<string>>,
  query: string,
  searchTag: string | null
): BlockOption[] {
  const { fuse, blockOptions } = useMemo(() => {
    if (isEmpty(blocks)) {
      return {
        fuse: null,
        blockOptions: EMPTY_BLOCK_RESULTS,
      };
    }

    function blockHasTag(block: IBlock): boolean {
      if (searchTag == null || searchTag === TAG_ALL) {
        return true;
      }

      // eslint-disable-next-line security/detect-object-injection -- tag values come from the API
      return taggedBrickIds[searchTag].has(block.id);
    }

    const blockOptions = sortBy(
      (blocks ?? [])
        // We should never show @internal bricks to users. They'll sometimes find their way in from the registry.
        .filter((x) => !x.id.startsWith("@internal/") && blockHasTag(x))
        .map((x) => makeBlockOption(x)),
      (x) => x.label
    );
    const fuse = new Fuse<BlockOption>(blockOptions, {
      keys: ["label", "blockResult.description", "value"],
      // Arbitrary threshold that seems strict enough to avoid search results that are unrelated to the query.
      threshold: 0.2,
      // If ignoreLocation is false (which it is, by default), Fuse will only consider the first threshold * distance
      // number of characters while scoring (assuming location is 0).
      // We want to match on any part of the string, so we set ignoreLocation to true.
      // See https://fusejs.io/concepts/scoring-theory.html#scoring-theory for more information.
      ignoreLocation: true,
    });

    return { blockOptions, fuse };
  }, [blocks, searchTag, taggedBrickIds]);

  return useMemo(
    () =>
      isNullOrBlank(query) || !fuse
        ? blockOptions
        : fuse.search(query).map((x) => x.item),
    [query, fuse, blockOptions]
  );
}

export default useBlockSearch;
