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

import { useDispatch, useSelector } from "react-redux";
import { selectNodeDataPanelSearchQueries } from "@/devTools/editor/uiState/uiState";
import { useCallback } from "react";
import { actions } from "@/devTools/editor/slices/editorSlice";
import { produce } from "immer";

export default function useDataPanelSearchQueries(): [
  queriesByTab: Record<string, string>,
  onQueryChangedForTab: (tabKey: string, query: string) => void
] {
  const dispatch = useDispatch();

  const queriesByTab = useSelector(selectNodeDataPanelSearchQueries);
  const setQueries = useCallback(
    (queriesByTab: Record<string, string>) => {
      dispatch(actions.setNodeDataPanelSearchQueries(queriesByTab));
    },
    [dispatch]
  );

  const onQueryChangedForTab = useCallback(
    (tabKey: string, query: string) => {
      console.log(`tab: ${tabKey}, new query: ${query}`);
      const newQueries = produce(queriesByTab, (draft) => {
        // eslint-disable-next-line security/detect-object-injection
        draft[tabKey] = query;
      });
      setQueries(newQueries);
    },
    [queriesByTab, setQueries]
  );

  return [queriesByTab, onQueryChangedForTab];
}
