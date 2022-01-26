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

import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import { actions } from "@/devTools/editor/slices/editorSlice";
import { selectNodeDataPanelTabSearchQuery } from "@/devTools/editor/uiState/uiState";
import { RootState } from "@/devTools/store";

export default function useDataPanelTabSearchQuery(
  tabKey: string
): [query: string, setQuery: (query: string) => void] {
  const dispatch = useDispatch();

  const query = useSelector((state: RootState) =>
    selectNodeDataPanelTabSearchQuery(state, tabKey)
  );
  const setQuery = useCallback(
    (query: string) => {
      dispatch(actions.setNodeDataPanelTabSearchQuery({ tabKey, query }));
    },
    [dispatch, tabKey]
  );

  return [query, setQuery];
}
