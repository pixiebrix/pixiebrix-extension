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

import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect } from "react";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { type DataPanelTabKey } from "./dataPanelTypes";
import { selectNodeDataPanelTabSelected } from "@/pageEditor/store/editor/editorSelectors";

export default function useDataPanelActiveTabKey(
  defaultTabKey: DataPanelTabKey,
): [
  activeKey: DataPanelTabKey,
  onSelectTab: (eventKey: DataPanelTabKey) => void,
] {
  const dispatch = useDispatch();

  const savedActiveKey = useSelector(selectNodeDataPanelTabSelected);
  const onSelectTab = useCallback(
    (eventKey: DataPanelTabKey) => {
      dispatch(actions.setNodeDataPanelTabSelected(eventKey));
    },
    [dispatch],
  );

  useEffect(() => {
    if (!savedActiveKey) {
      onSelectTab(defaultTabKey);
    }
  }, [defaultTabKey, onSelectTab, savedActiveKey]);

  return [savedActiveKey ?? defaultTabKey, onSelectTab];
}
