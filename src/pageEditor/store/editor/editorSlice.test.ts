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

import {
  editorSlice,
  actions,
  initialState,
  persistEditorConfig,
} from "@/pageEditor/store/editor/editorSlice";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import {
  type EditorRootState,
  type EditorState,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { FOUNDATION_NODE_ID } from "@/pageEditor/store/editor/uiState";
import brickRegistry from "@/bricks/registry";
import {
  echoBrick,
  teapotBrick,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { type OutputKey } from "@/types/runtimeTypes";
import { defaultBrickConfig } from "@/bricks/util";
import { validateRegistryId } from "@/types/helpers";

import {
  autoUUIDSequence,
  uuidSequence,
} from "@/testUtils/factories/stringFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { toExpression } from "@/utils/expressionUtils";
import { getMaxMigrationsVersion } from "@/store/migratePersistedState";
import { migrations } from "@/store/editorMigrations";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { setActiveModId } from "./editorSliceHelpers";
import { castDraft } from "immer";

function getTabState(
  state: EditorState,
  tabKey: DataPanelTabKey = DataPanelTabKey.Input,
) {
  return state.brickPipelineUIStateById[state.activeModComponentId!]!
    .nodeUIStates[FOUNDATION_NODE_ID]!.dataPanel[tabKey];
}

const GOOGLE_SHEET_INTEGRATION_ID = validateRegistryId("google/sheet");

const standardBrick = brickConfigFactory({
  id: teapotBrick.id,
  outputKey: "teapotOutput" as OutputKey,
  config: defaultBrickConfig(teapotBrick.inputSchema),
});

const brickWithIntegration = brickConfigFactory({
  id: echoBrick.id,
  outputKey: "echoOutput" as OutputKey,
  config: {
    spreadsheetId: toExpression("var", "@google"),
    tabName: null,
    rowValues: {},
  },
});

describe("DataPanel state", () => {
  let state: EditorState;

  beforeEach(() => {
    state = editorSlice.reducer(
      initialState,
      actions.selectActivatedModComponentFormState(formStateFactory()),
    );
  });

  test("should set the query", () => {
    const editorState = editorSlice.reducer(
      state,
      actions.setNodeDataPanelTabSearchQuery({
        tabKey: DataPanelTabKey.Input,
        query: "test query",
      }),
    );

    expect(getTabState(editorState).query).toBe("test query");
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
        tabKey: DataPanelTabKey.Input,
        expandedState: nextExpandedState,
      }),
    );

    expect(getTabState(editorState).treeExpandedState).toEqual(
      nextExpandedState,
    );
  });

  test("should set the active element", () => {
    const editorState = editorSlice.reducer(
      state,
      actions.setActiveBuilderPreviewElement("test-field"),
    );

    expect(getTabState(editorState, DataPanelTabKey.Design).activeElement).toBe(
      "test-field",
    );
  });
});

describe("Add/Remove Bricks", () => {
  let editor: EditorState;

  const source = formStateFactory({
    formStateConfig: {
      label: "Test Mod Component",
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: GOOGLE_SHEET_INTEGRATION_ID,
          outputKey: "google" as OutputKey,
          configId: uuidSequence,
        }),
      ],
    },
    brickPipeline: [brickWithIntegration, standardBrick],
  });

  beforeEach(() => {
    brickRegistry.clear();
    brickRegistry.register([echoBrick, teapotBrick]);

    editor = editorSlice.reducer(
      initialState,
      actions.selectActivatedModComponentFormState(source),
    );
  });

  test("Add Brick", async () => {
    // Get initial bricks
    const initialBricks =
      editor.modComponentFormStates[0]!.modComponent.brickPipeline;

    // Add a Brick
    editor = editorSlice.reducer(
      editor,
      actions.addNode({
        block: standardBrick,
        pipelinePath: "modComponent.brickPipeline",
        pipelineIndex: 0,
      }),
    );

    // Ensure we have one more brick than we started with
    expect(
      editor.modComponentFormStates[0]!.modComponent.brickPipeline,
    ).toBeArrayOfSize(initialBricks.length + 1);
  });

  test("Remove Brick with Integration Dependency", async () => {
    // Get initial bricks and integration dependencies
    const initialBricks =
      editor.modComponentFormStates[0]!.modComponent.brickPipeline;
    const initialIntegrationDependencies =
      editor.modComponentFormStates[0]!.integrationDependencies;

    // Remove the brick with integration dependency
    editor = editorSlice.reducer(
      editor,
      actions.removeNode(brickWithIntegration.instanceId!),
    );

    // Ensure Integration Dependency was removed
    expect(
      editor.modComponentFormStates[0]!.modComponent.brickPipeline,
    ).toBeArrayOfSize(initialBricks.length - 1);
    expect(
      editor.modComponentFormStates[0]!.integrationDependencies,
    ).toBeArrayOfSize(initialIntegrationDependencies.length - 1);
  });

  test("Remove Brick without Integration Dependency", async () => {
    // Get initial bricks and integrations
    const initialBricks =
      editor.modComponentFormStates[0]!.modComponent.brickPipeline;
    const initialIntegrationDependencies =
      editor.modComponentFormStates[0]!.integrationDependencies;

    // Remove the brick with integration
    editor = editorSlice.reducer(
      editor,
      actions.removeNode(standardBrick.instanceId!),
    );

    // Ensure integration was NOT removed
    expect(
      editor.modComponentFormStates[0]!.modComponent.brickPipeline,
    ).toBeArrayOfSize(initialBricks.length - 1);
    expect(
      editor.modComponentFormStates[0]!.integrationDependencies,
    ).toBeArrayOfSize(initialIntegrationDependencies.length);
  });

  test("Can clone a mod compoenent", async () => {
    const dispatch = jest.fn();
    const getState: () => EditorRootState = () => ({ editor });

    await actions.cloneActiveModComponent()(dispatch, getState, undefined);

    // Dispatch call args (actions) should be:
    //  1. thunk pending
    //  2. addElement
    //  3. thunk fulfilled

    expect(dispatch).toHaveBeenCalledTimes(3);

    const action1 = dispatch.mock.calls[0][0];
    expect(action1).toHaveProperty(
      "type",
      "editor/cloneActiveModComponent/pending",
    );

    const action2 = dispatch.mock.calls[1][0];
    expect(action2).toHaveProperty("type", "editor/addModComponentFormState");
    expect(action2.payload).toEqual(
      expect.objectContaining({
        uuid: expect.not.stringMatching(source.uuid),
        label: "Test Mod Component (Copy)",
      }),
    );
    expect(action2.payload).not.toHaveProperty("recipe");

    const action3 = dispatch.mock.calls[2][0];
    expect(action3).toHaveProperty(
      "type",
      "editor/cloneActiveModComponent/fulfilled",
    );
  });
});

describe("persistEditorConfig", () => {
  test("version is the highest migration version", () => {
    const maxVersion = getMaxMigrationsVersion(migrations);
    expect(persistEditorConfig.version).toBe(maxVersion);
  });
});

describe("Mod Options editing", () => {
  let initialState: EditorState;
  const modId = validateRegistryId("test/mod");
  const modMetadata = modMetadataFactory({ id: modId });

  const existingComponentId = autoUUIDSequence();

  const existingComponent = formStateFactory({
    formStateConfig: {
      uuid: existingComponentId,
      modMetadata,
    },
  });

  beforeEach(() => {
    initialState = {
      ...editorSlice.getInitialState(),
      modComponentFormStates: [existingComponent],
    };
    // Make the mod active
    setActiveModId(castDraft(initialState), modId);
    // Edit the mod options
    initialState = editorSlice.reducer(
      initialState,
      actions.editModOptionsValues({ testOption: "initial value" }),
    );
  });

  test("mod options are updated correctly", () => {
    const updatedOptionsArgs = { testOption: "updated value" };
    const stateAfterEdit = editorSlice.reducer(
      initialState,
      actions.editModOptionsValues(updatedOptionsArgs),
    );

    // Check if the existing component's options are updated
    const updatedExistingComponent = stateAfterEdit.modComponentFormStates.find(
      (component) => component.uuid === existingComponentId,
    );
    expect(updatedExistingComponent?.optionsArgs).toEqual(updatedOptionsArgs);
  });

  // Skipping this for now, because there is some weirdness around how "deleted" form states inside mods are handled
  // eslint-disable-next-line jest/no-disabled-tests -- see above
  test.skip("deleted mod component form states have their mod options updated correctly", () => {
    // Add another component with the same mod metadata, and then delete it
    const additionalComponentId = autoUUIDSequence();
    const newFormState = formStateFactory({
      formStateConfig: {
        uuid: additionalComponentId,
        modMetadata,
        optionsArgs: { testOption: "initial value" },
      },
    });

    // Add the additional component
    const stateAfterAddition = editorSlice.reducer(
      initialState,
      actions.addModComponentFormState(newFormState),
    );

    expect(stateAfterAddition.modComponentFormStates).toHaveLength(2);

    // Delete the additional component
    const stateAfterDeletion = {
      // Need the object to be extensible
      ...editorSlice.reducer(
        stateAfterAddition,
        actions.removeModComponentFormState(additionalComponentId),
      ),
    };

    expect(stateAfterDeletion.modComponentFormStates).toHaveLength(1);
    expect(
      stateAfterDeletion.deletedModComponentFormStatesByModId[modId],
    ).toContainEqual(
      expect.objectContaining({
        uuid: additionalComponentId,
        optionsArgs: { testOption: "initial value" },
      }),
    );

    // Make the mod active again
    setActiveModId(castDraft(stateAfterDeletion), modId);

    // Edit mod options values
    const updatedOptionsArgs = { testOption: "updated value" };
    const stateAfterEdit = editorSlice.reducer(
      stateAfterDeletion,
      actions.editModOptionsValues(updatedOptionsArgs),
    );

    // Check if the existing component's options are updated
    const updatedExistingComponent = stateAfterEdit.modComponentFormStates.find(
      (component) => component.uuid === existingComponentId,
    );
    expect(updatedExistingComponent?.optionsArgs).toEqual(updatedOptionsArgs);

    // Check whether the deleted component's options are updated
    const updatedDeletedComponents =
      stateAfterEdit.deletedModComponentFormStatesByModId[modId];
    expect(updatedDeletedComponents).toBeDefined();
    const updatedDeletedComponent = updatedDeletedComponents?.find(
      (component) => component.uuid === additionalComponentId,
    );
    expect(updatedDeletedComponent?.optionsArgs).toEqual(updatedOptionsArgs);

    // Ensure the state is marked as dirty for the existing component
    expect(stateAfterEdit.dirty[existingComponentId]).toBe(true);

    // Ensure the state is not marked as dirty for the deleted component
    expect(stateAfterEdit.dirty[additionalComponentId]).toBeUndefined();
  });

  test("new component with existing mod metadata receives dirty mod options", () => {
    const newComponentId = autoUUIDSequence();
    const newComponent = formStateFactory({
      formStateConfig: {
        uuid: newComponentId,
        modMetadata: modMetadataFactory({ id: modId }),
      },
    });

    const state = editorSlice.reducer(
      initialState,
      actions.addModComponentFormState(newComponent),
    );

    expect(state.modComponentFormStates).toHaveLength(2);
    const addedComponent = state.modComponentFormStates.find(
      (component) => component.uuid === newComponentId,
    );
    expect(addedComponent).toBeDefined();
    expect(addedComponent?.optionsArgs).toEqual({
      testOption: "initial value",
    });
  });
});
