/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import hash from "object-hash";
import { useMemo } from "react";
import { FormState } from "@/devTools/editor/editorSlice";
import { sortBy, uniq } from "lodash";

function selectIds(elements: FormState[]): string[] {
  return sortBy(
    uniq(
      elements.flatMap((x) => [
        x.extensionPoint.metadata.id,
        ...x.readers.map((x) => x.metadata.id),
      ])
    )
  );
}

/**
 * Returns package names being used by elements currently being edited
 * @param elements
 */
function useReservedNames(elements: FormState[]): string[] {
  const nameHash = hash(selectIds(elements));
  return useMemo(
    () => selectIds(elements),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using memo to enforce reference equality for list
    [nameHash]
  );
}

export default useReservedNames;
