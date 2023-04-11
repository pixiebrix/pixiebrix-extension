/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import {
  blockConfigFactory,
  formStateFactory,
  uuidSequence,
} from "@/testUtils/factories";
import {
  type EditorRootState,
  type EditorState,
} from "@/pageEditor/pageEditorTypes";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import blockRegistry from "@/blocks/registry";
import {
  echoBlock,
  teapotBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { type OutputKey } from "@/types/runtimeTypes";
import { defaultBlockConfig } from "@/blocks/util";
import { validateRegistryId } from "@/types/helpers";
import { makeVariableExpression } from "@/runtime/expressionCreators";

function getTabState(
  state: EditorState,
  tabKey: DataPanelTabKey = DataPanelTabKey.Context
) {
  return state.elementUIStates[state.activeElementId].nodeUIStates[
    FOUNDATION_NODE_ID
  ].dataPanel[tabKey];
}

const GOOGLE_SHEET_SERVICE_ID = validateRegistryId("google/sheet");

const standardBrick = blockConfigFactory({
  id: teapotBlock.id,
  outputKey: "teapotOutput" as OutputKey,
  config: defaultBlockConfig(teapotBlock.inputSchema),
});

const brickWithService = blockConfigFactory({
  id: echoBlock.id,
  outputKey: "echoOutput" as OutputKey,
  config: {
    spreadsheetId: makeVariableExpression("@google"),
    tabName: null,
    rowValues: {},
  },
});

describe("DataPanel state", () => {
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

    expect(getTabState(editorState).query).toEqual("test query");
  });

  test("should set the expanded state", () => {
    const nextExpandedState = {
      foo: {
        bar: true,
      },
    };

    const editorState = editorSlice.reducer(
      state,
      actions.setNodeDataPanelTabExpandedState({
        tabKey: DataPanelTabKey.Context,
        expandedState: nextExpandedState,
      })
    );

    expect(getTabState(editorState).treeExpandedState).toEqual(
      nextExpandedState
    );
  });

  test("should set the active element", () => {
    const editorState = editorSlice.reducer(
      state,
      actions.setNodePreviewActiveElement("test-field")
    );

    expect(
      getTabState(editorState, DataPanelTabKey.Preview).activeElement
    ).toEqual("test-field");
  });
});

describe("Add/Remove Bricks", () => {
  let editor: EditorState;

  const source = formStateFactory(
    {
      label: "Test Extension",
      services: [
        {
          id: GOOGLE_SHEET_SERVICE_ID,
          config: uuidSequence(2),
          outputKey: "google" as OutputKey,
        },
      ],
    },
    [brickWithService, standardBrick]
  );

  beforeEach(() => {
    blockRegistry.clear();
    blockRegistry.register([echoBlock, teapotBlock]);

    editor = editorSlice.reducer(initialState, actions.selectInstalled(source));
  });

  test("Add Brick", async () => {
    // Get initial bricks
    const initialBricks = editor.elements[0].extension.blockPipeline;

    // Add a Brick
    editor = editorSlice.reducer(
      editor,
      actions.addNode({
        block: standardBrick,
        pipelinePath: "extension.blockPipeline",
        pipelineIndex: 0,
      })
    );

    // Ensure we have one more brick than we started with
    expect(editor.elements[0].extension.blockPipeline).toBeArrayOfSize(
      initialBricks.length + 1
    );
  });

  test("Remove Brick with Service", async () => {
    // Get initial bricks and services
    const initialBricks = editor.elements[0].extension.blockPipeline;
    const initialServices = editor.elements[0].services;

    // Remove the brick with service
    editor = editorSlice.reducer(
      editor,
      actions.removeNode(brickWithService.instanceId)
    );

    // Ensure Service was removed
    expect(editor.elements[0].extension.blockPipeline).toBeArrayOfSize(
      initialBricks.length - 1
    );
    expect(editor.elements[0].services).toBeArrayOfSize(
      initialServices.length - 1
    );
  });

  test("Remove Brick without Service", async () => {
    // Get initial bricks and services
    const initialBricks = editor.elements[0].extension.blockPipeline;
    const initialServices = editor.elements[0].services;

    // Remove the brick with service
    editor = editorSlice.reducer(
      editor,
      actions.removeNode(standardBrick.instanceId)
    );

    // Ensure Service was NOT removed
    expect(editor.elements[0].extension.blockPipeline).toBeArrayOfSize(
      initialBricks.length - 1
    );
    expect(editor.elements[0].services).toBeArrayOfSize(initialServices.length);
  });

  test("Can clone an extension", async () => {
    const dispatch = jest.fn();
    const getState: () => EditorRootState = () => ({ editor });

    await actions.cloneActiveExtension()(dispatch, getState, undefined);

    // Dispatch call args (actions) should be:
    //  1. thunk pending
    //  2. addElement
    //  3. thunk fulfilled

    expect(dispatch).toHaveBeenCalledTimes(3);

    const action1 = dispatch.mock.calls[0][0];
    expect(action1).toHaveProperty(
      "type",
      "editor/cloneActiveExtension/pending"
    );

    const action2 = dispatch.mock.calls[1][0];
    expect(action2).toHaveProperty("type", "editor/addElement");
    expect(action2.payload).toEqual(
      expect.objectContaining({
        uuid: expect.not.stringMatching(source.uuid),
        label: "Test Extension - copy",
      })
    );
    expect(action2.payload).not.toHaveProperty("recipe");

    const action3 = dispatch.mock.calls[2][0];
    expect(action3).toHaveProperty(
      "type",
      "editor/cloneActiveExtension/fulfilled"
    );
  });
});
