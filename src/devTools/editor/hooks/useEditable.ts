/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { useMemo } from "react";
import { useAsyncState } from "@/hooks/common";
import { RootState } from "@/devTools/store";
import { getLinkedApiClient } from "@/services/apiClient";
import { EditablePackage } from "@/types/definitions";

const selectEditor = (x: RootState) => x.editor;

function useEditable(): Set<string> {
  const { knownEditable } = useSelector(selectEditor);

  const [initialEditable] = useAsyncState(async () => {
    const client = await getLinkedApiClient();
    const { data } = await client.get<EditablePackage[]>("api/bricks/");
    return new Set(data.map((x) => x.name));
  }, []);

  return useMemo<Set<string>>(() => {
    // Set union
    const rv = new Set<string>(initialEditable ?? new Set());
    for (const x of knownEditable) {
      rv.add(x);
    }

    return rv;
  }, [initialEditable, knownEditable]);
}

export default useEditable;
