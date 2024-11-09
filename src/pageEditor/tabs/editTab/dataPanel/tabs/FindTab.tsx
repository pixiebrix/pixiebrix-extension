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
import {
  selectGetModComponentFormStateByModComponentId,
  selectGetModDraftStateForModId,
  selectNodeDataPanelTabState,
} from "@/pageEditor/store/editor/editorSelectors";
import {
  type BrickContext,
  isFieldValueItem,
  type IndexedItem,
  isBrickCommentsItem,
} from "@/pageEditor/find/searchIndexVisitor";
import { assertNotNullish } from "@/utils/nullishUtils";

function getLocationBrickLabel(brickContext: BrickContext): string {
  return (
    brickContext.brickConfig.label ??
    brickContext.brick?.name ??
    brickContext.brickConfig.id
  );
}

const ResultPath: React.VFC<{ paths: string[] }> = ({ paths }) => (
  <div className="small">{paths.join(" > ")}</div>
);

const ResultItem: React.VFC<{ item: IndexedItem; onClick: () => void }> = ({
  item,
  onClick,
}) => {
  const getModComponentFormStateByModComponentId = useSelector(
    selectGetModComponentFormStateByModComponentId,
  );
  const getModDraftStateForModId = useSelector(selectGetModDraftStateForModId);

  const formState = getModComponentFormStateByModComponentId(
    item.location.modComponentId,
  );
  assertNotNullish(formState, "Form State not found for mod");

  const draftState = getModDraftStateForModId(formState?.modMetadata.id);

  assertNotNullish(draftState, "Draft state not found for mod");

  if (isBrickCommentsItem(item)) {
    return (
      <ListGroup.Item onClick={onClick}>
        <div>{item.data.comments}</div>
        <ResultPath
          paths={[
            formState.label,
            ...item.location.brickStack.map((x) => getLocationBrickLabel(x)),
          ]}
        />
      </ListGroup.Item>
    );
  }

  if (isFieldValueItem(item)) {
    const { prop, schema } = item.location.fieldRef;
    return (
      <ListGroup.Item onClick={onClick}>
        <div>{item.data.value}</div>
        <ResultPath
          paths={[
            formState.label,
            ...item.location.brickStack.map((x) => getLocationBrickLabel(x)),
            schema?.title ?? prop,
          ]}
        />
      </ListGroup.Item>
    );
  }

  const brickContext = item.location.brickStack.at(-1);
  assertNotNullish(brickContext, "Expected context for brick match");

  const brickLabel = getLocationBrickLabel(brickContext);

  return (
    <ListGroup.Item onClick={onClick}>
      <div>{brickLabel}</div>
      <ResultPath
        paths={[
          formState.label,
          ...item.location.brickStack
            .slice(0, -1)
            .map((x) => getLocationBrickLabel(x)),
        ]}
      />
    </ListGroup.Item>
  );
};

const FindTab: React.VFC = () => {
  const dispatch = useDispatch();

  const { query = "" } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Find),
    ) ?? {};

  const searchResults = useFind(query);

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
        {searchResults.map(({ refIndex, item }) => (
          <ResultItem
            key={refIndex}
            item={item}
            onClick={() => {
              dispatch(
                editorActions.setActiveModComponentId(
                  item.location.modComponentId,
                ),
              );
              // FIXME: instanceId won't be available unless the user has clicked into the item
              dispatch(
                editorActions.setActiveNodeId(
                  item.location.brickStack.at(-1)!.brickConfig.instanceId!,
                ),
              );

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
