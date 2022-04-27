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

import {
  editorSlice,
  actions,
  initialState,
} from "@/pageEditor/slices/editorSlice";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { formStateFactory } from "@/testUtils/factories";
import { EditorState } from "@/pageEditor/pageEditorTypes";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";

function getTabState(
  state: EditorState,
  tabKey: DataPanelTabKey = DataPanelTabKey.Context
) {
  return state.elementUIStates[state.activeElementId].nodeUIStates[
    FOUNDATION_NODE_ID
  ].dataPanel[tabKey];
}

describe("PataPanel state", () => {
  let state: EditorState;

  beforeEach(() => {
    state = editorSlice.reducer(
      initialState,
      actions.selectInstalled(formStateFactory())
    );
  });

  test("should set the query", () => {
    const editorState = editorSlice.reducer(
      state,
      actions.setNodeDataPanelTabSearchQuery({
        tabKey: DataPanelTabKey.Context,
        query: "test query",
      })
    );

    expect(getTabState(editorState)).toEqual({
      query: "test query",
    });
  });

  test("should set the expanded state", () => {
    const editorState = editorSlice.reducer(
      state,
      actions.setNodeDataPanelTabExpandedState({
        tabKey: DataPanelTabKey.Context,
        keyPath: ["foo", "bar"],
        isExpanded: true,
      })
    );

    expect(getTabState(editorState)).toEqual({
      treeExpandedState: {
        bar: {
          foo: true,
        },
      },
    });
  });

  test("should set the active element", () => {
    const editorState = editorSlice.reducer(
      state,
      actions.setNodePreviewActiveElement("test-field")
    );

    expect(getTabState(editorState, DataPanelTabKey.Preview)).toEqual({
      activeElement: "test-field",
    });
  });
});
