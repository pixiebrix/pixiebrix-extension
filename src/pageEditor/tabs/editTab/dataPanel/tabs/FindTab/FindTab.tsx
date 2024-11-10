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
import { selectCurrentFindQueryOptions } from "@/pageEditor/store/editor/editorSelectors";
import ResultItem, {
  useMatchData,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/ResultItem";
import {
  type IndexedItem,
  isStarterBrickContext,
} from "@/pageEditor/find/searchIndexVisitor";
import { assertNotNullish } from "@/utils/nullishUtils";
import { FOUNDATION_NODE_ID } from "@/pageEditor/store/editor/uiState";
import { type AppDispatch } from "@/pageEditor/store/store";

function jumpToItemLocationAction(item: IndexedItem) {
  return (dispatch: AppDispatch) => {
    const context = item.location.brickStack.at(-1);
    assertNotNullish(context, "brickStack is empty");

    dispatch(
      editorActions.setActiveModComponentId(item.location.modComponentId),
    );

    if (isStarterBrickContext(context)) {
      dispatch(editorActions.setActiveNodeId(FOUNDATION_NODE_ID));
    } else {
      // `useFind` uses useEnsureFormStates to ensure all mod components have been mapped to form states
      assertNotNullish(context.brickConfig.instanceId, "Expected instanceId");
      dispatch(editorActions.setActiveNodeId(context.brickConfig.instanceId));
    }
  };
}

const FindTab: React.VFC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { query } = useSelector(selectCurrentFindQueryOptions);

  const searchResults = useFind(query);
  const matches = useMatchData(searchResults);

  return (
    <DataTabPane
      eventKey={DataPanelTabKey.Find}
      role="search"
      aria-label="Within mod"
    >
      <div className="d-flex flex-column h-100">
        <div>
          <FieldTemplate
            value={query}
            name="find"
            type="search"
            label="Find"
            placeholder="Find within mod"
            onChange={({ target }: React.ChangeEvent<HTMLInputElement>) => {
              dispatch(
                editorActions.setDataPanelTabFindQuery({
                  query: target.value,
                }),
              );
            }}
          />
        </div>

        <div
          // XXX: scroll is broken in DataTabPane: the whole data panel scrolls
          className="flex-grow-1 overflow-auto"
        >
          <ListGroup>
            {matches.map((data) => (
              <ResultItem
                key={data.refIndex}
                data={data}
                onClick={() => {
                  dispatch(jumpToItemLocationAction(data.item));
                }}
              />
            ))}
          </ListGroup>
        </div>
      </div>
    </DataTabPane>
  );
};

export default FindTab;
