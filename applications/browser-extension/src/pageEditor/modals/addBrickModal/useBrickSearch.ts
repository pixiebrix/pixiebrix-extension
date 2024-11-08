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

import { type Brick } from "@/types/brickTypes";
import { useMemo } from "react";
import { isEmpty, sortBy } from "lodash";
import Fuse from "fuse.js";
import {
  type BrickSelectOption,
  type BrickSearchResult,
} from "@/pageEditor/modals/addBrickModal/addBrickModalTypes";
import { TAG_ALL } from "@/pageEditor/modals/addBrickModal/addBrickModalConstants";
import { isNullOrBlank } from "@/utils/stringUtils";

function mapBrickSelectOption(brick: Brick): BrickSelectOption {
  return {
    value: brick.id,
    label: brick.name,
    brickResult: brick as BrickSearchResult,
  };
}

const EMPTY_BRICK_RESULTS: BrickSelectOption[] = [];

function useBrickSearch(
  bricks: Brick[],
  taggedBrickIds: Record<string, Set<string>>,
  query: string,
  searchTag: string | null,
): BrickSelectOption[] {
  const { fuse, brickOptions } = useMemo(() => {
    if (isEmpty(bricks)) {
      return {
        fuse: null,
        brickOptions: EMPTY_BRICK_RESULTS,
      };
    }

    function blockHasTag(brick: Brick): boolean {
      if (searchTag == null || searchTag === TAG_ALL) {
        return true;
      }

      // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-non-null-assertion -- tag values come from the API
      return taggedBrickIds[searchTag]!.has(brick.id);
    }

    const brickOptions = sortBy(
      (bricks ?? [])
        // We should never show @internal bricks to users. They'll sometimes find their way in from the registry.
        .filter((x) => !x.id.startsWith("@internal/") && blockHasTag(x))
        .map((x) => mapBrickSelectOption(x)),
      (x) => x.label,
    );
    const fuse = new Fuse<BrickSelectOption>(brickOptions, {
      keys: ["label", "blockResult.description", "value"],
      // Arbitrary threshold that seems strict enough to avoid search results that are unrelated to the query.
      threshold: 0.2,
      // If ignoreLocation is false (which it is, by default), Fuse will only consider the first threshold * distance
      // number of characters while scoring (assuming location is 0).
      // We want to match on any part of the string, so we set ignoreLocation to true.
      // See https://fusejs.io/concepts/scoring-theory.html#scoring-theory for more information.
      ignoreLocation: true,
    });

    return { brickOptions, fuse };
  }, [bricks, searchTag, taggedBrickIds]);

  return useMemo(
    () =>
      isNullOrBlank(query) || !fuse
        ? brickOptions
        : fuse.search(query).map((x) => x.item),
    [query, fuse, brickOptions],
  );
}

export default useBrickSearch;
