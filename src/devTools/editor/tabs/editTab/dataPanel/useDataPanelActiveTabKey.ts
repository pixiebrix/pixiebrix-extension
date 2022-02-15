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
import { selectNodeDataPanelTabSelected } from "@/devTools/editor/uiState/uiState";
import { useCallback, useEffect, useMemo } from "react";
import { actions } from "@/devTools/editor/slices/editorSlice";

export default function useDataPanelActiveTabKey(
  defaultTabKey: string
): [activeKey: string, onSelectTab: (eventKey: string) => void] {
  const dispatch = useDispatch();

  const savedActiveKey = useSelector(selectNodeDataPanelTabSelected);
  const onSelectTab = useCallback(
    (eventKey: string) => {
      dispatch(actions.setNodeDataPanelTabSelected(eventKey));
    },
    [dispatch]
  );

  useEffect(() => {
    if (!savedActiveKey) {
      onSelectTab(defaultTabKey);
    }
  }, [defaultTabKey, onSelectTab, savedActiveKey]);

  const activeKey = useMemo(
    () => savedActiveKey ?? defaultTabKey,
    [defaultTabKey, savedActiveKey]
  );

  return [activeKey, onSelectTab];
}
