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

import { type EditorState } from "@/pageEditor/pageEditorTypes";
import { initialState } from "@/pageEditor/slices/editorSlice";
import {
  FOUNDATION_NODE_ID,
  makeInitialBrickPipelineUIState,
  makeInitialNodeUIState,
} from "@/pageEditor/uiState/uiState";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import {
  ensureBrickPipelineUIState,
  ensureNodeUIState,
  removeModComponentFormState,
  removeModData,
  setActiveModId,
  setActiveNodeId,
  syncNodeUIStates,
} from "@/pageEditor/slices/editorSliceHelpers";
import { produce } from "immer";
import {
  type BrickPipelineUIState,
  type NodeUIState,
} from "@/pageEditor/uiState/uiStateTypes";
import { uuidv4 } from "@/types/helpers";
import {
  selectActiveModComponentId,
  selectActiveNodeId,
  selectActiveModId,
  selectDeletedComponentFormStatesByModId,
  selectDirtyMetadataForModId,
  selectDirtyOptionsDefinitionsForModId,
  selectModComponentFormStates,
  selectExpandedModId,
} from "@/pageEditor/slices/editorSelectors";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";

describe("ensureElementUIState", () => {
  test("does not affect existing ui state", () => {
    const element = formStateFactory();
    const state: EditorState = {
      ...initialState,
      modComponentFormStates: [element],
      brickPipelineUIStateById: {
        [element.uuid]: {
          ...makeInitialBrickPipelineUIState(),
          pipelineMap: getPipelineMap(element.extension.blockPipeline),
          activeNodeId: element.extension.blockPipeline[0].instanceId,
        },
      },
    };
    const newState = produce(state, (draft) => {
      ensureBrickPipelineUIState(draft, element.uuid);
    });
    expect(newState).toEqual(state);
  });

  test("adds ui state when not present", () => {
    const element = formStateFactory();
    const state: EditorState = {
      ...initialState,
      modComponentFormStates: [element],
    };
    const newState = produce(state, (draft) => {
      ensureBrickPipelineUIState(draft, element.uuid);
    });

    expect(newState.brickPipelineUIStateById).toContainKey(element.uuid);
  });
});

describe("ensureNodeUIState", () => {
  test("does not affect existing node state", () => {
    const element = formStateFactory();
    const nodeId = element.extension.blockPipeline[0].instanceId;
    const uiState: BrickPipelineUIState = {
      ...makeInitialBrickPipelineUIState(),
      pipelineMap: getPipelineMap(element.extension.blockPipeline),
      activeNodeId: nodeId,
    };
    const nodeState: NodeUIState = makeInitialNodeUIState(nodeId);
    uiState.nodeUIStates = {
      ...uiState.nodeUIStates,
      [nodeId]: {
        ...nodeState,
        dataPanel: {
          ...nodeState.dataPanel,
          activeTabKey: "output",
        },
      },
    };
    const newUiState = produce(uiState, (draft) => {
      ensureNodeUIState(draft, nodeId);
    });

    expect(newUiState).toEqual(uiState);
  });

  test("adds node states when not present", () => {
    const element = formStateFactory();
    const node1Id = element.extension.blockPipeline[0].instanceId;
    const node2Id = element.extension.blockPipeline[1].instanceId;
    const uiState: BrickPipelineUIState = {
      ...makeInitialBrickPipelineUIState(),
      pipelineMap: getPipelineMap(element.extension.blockPipeline),
      activeNodeId: node1Id,
    };
    const newUiState = produce(uiState, (draft) => {
      ensureNodeUIState(draft, node1Id);
      ensureNodeUIState(draft, node2Id);
    });

    expect(newUiState.nodeUIStates).toContainKeys([node1Id, node2Id]);
  });
});

describe("syncElementUIStates", () => {
  test("reset active node to foundation when node ids change, and removes invalid node states", () => {
    const element = formStateFactory();
    const nodeId = element.extension.blockPipeline[0].instanceId;
    const invalidNodeId = uuidv4();
    const uiState: BrickPipelineUIState = {
      ...makeInitialBrickPipelineUIState(),
      pipelineMap: getPipelineMap(element.extension.blockPipeline),
      activeNodeId: invalidNodeId,
    };
    const nodeState = makeInitialNodeUIState(nodeId);
    uiState.nodeUIStates = {
      ...uiState.nodeUIStates,
      [nodeId]: {
        ...nodeState,
        dataPanel: {
          ...nodeState.dataPanel,
          activeTabKey: "rendered",
        },
      },
      [invalidNodeId]: makeInitialNodeUIState(invalidNodeId),
    };
    const editorState: EditorState = {
      ...initialState,
      modComponentFormStates: [element],
      brickPipelineUIStateById: {
        [element.uuid]: uiState,
      },
      activeModComponentId: element.uuid,
    };
    const newEditorState = produce(editorState, (draft) => {
      syncNodeUIStates(draft, element);
    });

    expect(selectActiveNodeId({ editor: newEditorState })).toEqual(
      FOUNDATION_NODE_ID,
    );
    expect(
      newEditorState.brickPipelineUIStateById[element.uuid].nodeUIStates,
    ).not.toContainKey(invalidNodeId);
  });

  test("adds missing node states", () => {
    const element = formStateFactory();
    const node1Id = element.extension.blockPipeline[0].instanceId;
    const uiState: BrickPipelineUIState = {
      ...makeInitialBrickPipelineUIState(),
      pipelineMap: getPipelineMap(element.extension.blockPipeline),
      activeNodeId: node1Id,
    };
    const editorState: EditorState = {
      ...initialState,
      modComponentFormStates: [element],
      brickPipelineUIStateById: {
        [element.uuid]: uiState,
      },
    };
    const newEditorState = produce(editorState, (draft) => {
      syncNodeUIStates(draft, element);
    });

    // Maintains the foundation node state and adds the block node state for both blocks in the pipeline
    expect(
      newEditorState.brickPipelineUIStateById[element.uuid].nodeUIStates,
    ).toContainKey(FOUNDATION_NODE_ID);
    expect(
      newEditorState.brickPipelineUIStateById[element.uuid].nodeUIStates,
    ).toContainKey(node1Id);
    const node2Id = element.extension.blockPipeline[1].instanceId;
    expect(
      newEditorState.brickPipelineUIStateById[element.uuid].nodeUIStates,
    ).toContainKey(node2Id);
  });
});

describe("setActiveNodeId", () => {
  test("sets active node when node state is missing", () => {
    const element = formStateFactory();
    const nodeId = element.extension.blockPipeline[0].instanceId;
    const uiState: BrickPipelineUIState = {
      ...makeInitialBrickPipelineUIState(),
      pipelineMap: getPipelineMap(element.extension.blockPipeline),
    };
    const editorState: EditorState = {
      ...initialState,
      modComponentFormStates: [element],
      brickPipelineUIStateById: {
        [element.uuid]: uiState,
      },
      activeModComponentId: element.uuid,
    };
    const newEditorState = produce(editorState, (draft) => {
      setActiveNodeId(draft, nodeId);
    });

    expect(selectActiveNodeId({ editor: newEditorState })).toEqual(nodeId);
  });

  test("sets active node when node state is already present", () => {
    const element = formStateFactory();
    const nodeId = element.extension.blockPipeline[0].instanceId;
    const uiState: BrickPipelineUIState = {
      ...makeInitialBrickPipelineUIState(),
      pipelineMap: getPipelineMap(element.extension.blockPipeline),
    };
    const nodeState = makeInitialNodeUIState(nodeId);
    uiState.nodeUIStates = {
      ...uiState.nodeUIStates,
      [nodeId]: {
        ...nodeState,
        dataPanel: {
          ...nodeState.dataPanel,
          activeTabKey: "rendered",
        },
      },
    };
    const editorState: EditorState = {
      ...initialState,
      modComponentFormStates: [element],
      brickPipelineUIStateById: {
        [element.uuid]: uiState,
      },
      activeModComponentId: element.uuid,
    };
    const newEditorState = produce(editorState, (draft) => {
      setActiveNodeId(draft, nodeId);
    });

    expect(selectActiveNodeId({ editor: newEditorState })).toEqual(nodeId);
  });
});

jest.mock("@/telemetry/trace");

describe("removeElement", () => {
  test("removes active element and clears all associated data", () => {
    const element = formStateFactory();
    const state: EditorState = {
      ...initialState,
      modComponentFormStates: [element],
      activeModComponentId: element.uuid,
      dirty: {
        [element.uuid]: true,
      },
      brickPipelineUIStateById: {
        [element.uuid]: {
          ...makeInitialBrickPipelineUIState(),
          pipelineMap: getPipelineMap(element.extension.blockPipeline),
          activeNodeId: element.extension.blockPipeline[0].instanceId,
        },
      },
      availableDraftModComponentIds: [element.uuid],
    };

    const newState = produce(state, (draft) => {
      removeModComponentFormState(draft, element.uuid);
    });
    expect(selectActiveModComponentId({ editor: newState })).toBeNull();
    expect(selectModComponentFormStates({ editor: newState })).not.toContain(
      element,
    );
    expect(newState.dirty).not.toContainKey(element.uuid);
    expect(newState.brickPipelineUIStateById).not.toContainKey(element.uuid);
  });

  test("removes inactive and unavailable mod component form state", () => {
    const availableModComponentFormState = formStateFactory();
    const unavailableModComponentFormState = formStateFactory();
    const state: EditorState = {
      ...initialState,
      modComponentFormStates: [
        availableModComponentFormState,
        unavailableModComponentFormState,
      ],
      activeModComponentId: availableModComponentFormState.uuid,
      dirty: {
        [availableModComponentFormState.uuid]: false,
        [unavailableModComponentFormState.uuid]: true,
      },
      brickPipelineUIStateById: {
        [availableModComponentFormState.uuid]: {
          ...makeInitialBrickPipelineUIState(),
          pipelineMap: getPipelineMap(
            availableModComponentFormState.extension.blockPipeline,
          ),
          activeNodeId:
            availableModComponentFormState.extension.blockPipeline[0]
              .instanceId,
        },
        [unavailableModComponentFormState.uuid]: {
          ...makeInitialBrickPipelineUIState(),
          pipelineMap: getPipelineMap(
            unavailableModComponentFormState.extension.blockPipeline,
          ),
          activeNodeId:
            unavailableModComponentFormState.extension.blockPipeline[0]
              .instanceId,
        },
      },
      availableDraftModComponentIds: [availableModComponentFormState.uuid],
    };

    const newState = produce(state, (draft) => {
      removeModComponentFormState(draft, unavailableModComponentFormState.uuid);
    });
    expect(selectActiveModComponentId({ editor: newState })).toEqual(
      availableModComponentFormState.uuid,
    );
    expect(selectModComponentFormStates({ editor: newState })).not.toContain(
      unavailableModComponentFormState,
    );
    expect(newState.dirty).not.toContainKey(
      unavailableModComponentFormState.uuid,
    );
    expect(newState.brickPipelineUIStateById).not.toContainKey(
      unavailableModComponentFormState.uuid,
    );
  });
});

describe("removeModData", () => {
  test("removes expanded active mod", () => {
    const modMetadata = modMetadataFactory();
    const modComponentFormState1 = formStateFactory({ recipe: modMetadata });
    const modComponentFormState2 = formStateFactory({ recipe: modMetadata });
    const orphanModComponentFormState = formStateFactory();
    const state: EditorState = {
      ...initialState,
      modComponentFormStates: [
        modComponentFormState1,
        modComponentFormState2,
        orphanModComponentFormState,
      ],
      activeModId: modMetadata.id,
      expandedModId: modMetadata.id,
      dirty: {
        [modComponentFormState2.uuid]: true,
        [orphanModComponentFormState.uuid]: false,
      },
      brickPipelineUIStateById: {
        [modComponentFormState1.uuid]: {
          ...makeInitialBrickPipelineUIState(),
          pipelineMap: getPipelineMap(
            modComponentFormState1.extension.blockPipeline,
          ),
          activeNodeId:
            modComponentFormState1.extension.blockPipeline[0].instanceId,
        },
        [modComponentFormState2.uuid]: {
          ...makeInitialBrickPipelineUIState(),
          pipelineMap: getPipelineMap(
            modComponentFormState2.extension.blockPipeline,
          ),
          activeNodeId:
            modComponentFormState2.extension.blockPipeline[0].instanceId,
        },
        [orphanModComponentFormState.uuid]: {
          ...makeInitialBrickPipelineUIState(),
          pipelineMap: getPipelineMap(
            orphanModComponentFormState.extension.blockPipeline,
          ),
          activeNodeId:
            orphanModComponentFormState.extension.blockPipeline[0].instanceId,
        },
      },
      availableDraftModComponentIds: [
        modComponentFormState1.uuid,
        orphanModComponentFormState.uuid,
      ],
      dirtyModOptionsById: {
        [modMetadata.id]: {
          schema: {
            type: "object",
            properties: {
              foo: {
                type: "string",
              },
            },
          },
        },
      },
      dirtyModMetadataById: {
        [modMetadata.id]: {
          ...modMetadata,
          description: "new description",
        },
      },
      deletedModComponentFormStatesByModId: {
        [modMetadata.id]: [modComponentFormState2],
      },
    };

    const newState = produce(state, (draft) => {
      removeModComponentFormState(draft, modComponentFormState1.uuid);
      removeModComponentFormState(draft, modComponentFormState2.uuid);
      removeModData(draft, modMetadata.id);
    });
    expect(selectActiveModId({ editor: newState })).toBeNull();
    expect(selectExpandedModId({ editor: newState })).toBeNull();
    expect(
      selectDirtyOptionsDefinitionsForModId(modMetadata.id)({
        editor: newState,
      }),
    ).toBeUndefined();
    expect(
      selectDirtyMetadataForModId(modMetadata.id)({ editor: newState }),
    ).toBeUndefined();
    expect(
      selectDeletedComponentFormStatesByModId({ editor: newState })[
        modMetadata.id
      ],
    ).toBeUndefined();
  });
});

describe("selectActiveModId", () => {
  test("select unselected mod", () => {
    const mod = modMetadataFactory();
    const newState = produce(initialState, (draft) => {
      setActiveModId(draft, mod.id);
    });
    expect(selectActiveModId({ editor: newState })).toEqual(mod.id);
    expect(selectExpandedModId({ editor: newState })).toEqual(mod.id);
  });

  test("re-select selected mod", () => {
    const mod = modMetadataFactory();
    const state: EditorState = {
      ...initialState,
      activeModId: mod.id,
      expandedModId: mod.id,
    };
    const newState = produce(state, (draft) => {
      setActiveModId(draft, mod.id);
    });
    expect(selectActiveModId({ editor: newState })).toEqual(mod.id);
    expect(selectExpandedModId({ editor: newState })).toBeNull();
  });
});
