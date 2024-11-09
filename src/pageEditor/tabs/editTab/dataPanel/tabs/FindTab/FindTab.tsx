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
import React from "react";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import useFind from "@/pageEditor/find/useFind";
import FieldTemplate from "@/components/form/FieldTemplate";
import { ListGroup } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/store/editor/editorSelectors";
import ResultItem, {
  useMatchData,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/ResultItem";

const FindTab: React.VFC = () => {
  const dispatch = useDispatch();

  const { query = "" } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Find),
    ) ?? {};

  const searchResults = useFind(query);
  const matches = useMatchData(searchResults);

  return (
    <DataTabPane
      eventKey={DataPanelTabKey.Find}
      role="search"
      aria-label="Within mod"
    >
      <div>
        <FieldTemplate
          value={query}
          name="search"
          type="search"
          label="Search"
          placeholder="Search within mod"
          onChange={({ target }: React.ChangeEvent<HTMLInputElement>) => {
            dispatch(
              editorActions.setNodeDataPanelTabSearchQuery({
                tabKey: DataPanelTabKey.Find,
                query: target.value,
              }),
            );
          }}
        />
      </div>
      <ListGroup>
        {matches.map(({ refIndex, item, ...data }) => (
          <ResultItem
            key={refIndex}
            data={data}
            onClick={() => {
              dispatch(
                editorActions.setActiveModComponentId(
                  item.location.modComponentId,
                ),
              );
              // FIXME: instanceId won't be available unless the user has clicked into the item
              // dispatch(
              //   editorActions.setActiveNodeId(
              //     item.location.brickStack.at(-1)!.brickConfig.instanceId!,
              //   ),
              // );

              // HACK: make the search tab persist when clicking into a result
              dispatch(
                editorActions.setNodeDataPanelTabSelected(DataPanelTabKey.Find),
              );
              dispatch(
                editorActions.setNodeDataPanelTabSearchQuery({
                  tabKey: DataPanelTabKey.Find,
                  query,
                }),
              );
            }}
          />
        ))}
      </ListGroup>
    </DataTabPane>
  );
};

export default FindTab;
