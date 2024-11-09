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
import useSearch from "@/pageEditor/search/useSearch";
import FieldTemplate from "@/components/form/FieldTemplate";
import { ListGroup } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/store/editor/editorSelectors";
import { isBrickItem } from "@/pageEditor/search/searchIndexVisitor";

const SearchTab: React.VFC = () => {
  const dispatch = useDispatch();

  const { query = "" } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Search),
    ) ?? {};

  const searchResults = useSearch(query);

  return (
    <DataTabPane eventKey={DataPanelTabKey.Search}>
      <div>
        <FieldTemplate
          value={query}
          name="search"
          label="Search"
          placeholder="Search within mod"
          onChange={({ target }: React.ChangeEvent<HTMLInputElement>) => {
            dispatch(
              editorActions.setNodeDataPanelTabSearchQuery({
                tabKey: DataPanelTabKey.Search,
                query: target.value,
              }),
            );
          }}
        />
      </div>
      <ListGroup>
        {searchResults.map(({ refIndex, item }) => (
          <ListGroup.Item
            key={refIndex}
            onClick={() => {
              dispatch(
                editorActions.setActiveModComponentId(
                  item.location.modComponentId,
                ),
              );
              // FIXME: instanceId won't be available unless the user has clicked into the item
              dispatch(
                editorActions.setActiveNodeId(
                  item.location.brickConfig.instanceId,
                ),
              );

              // HACK: make the search tab persist when clicking into a result
              dispatch(
                editorActions.setNodeDataPanelTabSelected(
                  DataPanelTabKey.Search,
                ),
              );
              dispatch(
                editorActions.setNodeDataPanelTabSearchQuery({
                  tabKey: DataPanelTabKey.Search,
                  query,
                }),
              );
            }}
          >
            {isBrickItem(item)
              ? item.data.label ?? item.data.brick.name
              : item.data.value}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </DataTabPane>
  );
};

export default SearchTab;
