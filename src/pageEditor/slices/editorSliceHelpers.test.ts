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

import { type EditorState } from "@/pageEditor/pageEditorTypes";
import { initialState } from "@/pageEditor/slices/editorSlice";
import {
  FOUNDATION_NODE_ID,
  makeInitialElementUIState,
  makeInitialNodeUIState,
} from "@/pageEditor/uiState/uiState";
import {
  formStateFactory,
  installedRecipeMetadataFactory,
} from "@/testUtils/factories";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import {
  ensureElementUIState,
  ensureNodeUIState,
  removeElement,
  removeRecipeData,
  selectRecipeId,
  setActiveNodeId,
  syncElementNodeUIStates,
} from "@/pageEditor/slices/editorSliceHelpers";
import { produce } from "immer";
import {
  type ElementUIState,
  type NodeUIState,
} from "@/pageEditor/uiState/uiStateTypes";
import { uuidv4 } from "@/types/helpers";
import {
  selectActiveElementId,
  selectActiveNodeId,
  selectActiveRecipeId,
  selectDeletedElements,
  selectDirtyMetadataForRecipeId,
  selectDirtyOptionDefinitionsForRecipeId,
  selectElements,
  selectExpandedRecipeId,
} from "@/pageEditor/slices/editorSelectors";

describe("ensureElementUIState", () => {
  test("does not affect existing ui state", () => {
    const element = formStateFactory();
    const state: EditorState = {
      ...initialState,
      elements: [element],
      elementUIStates: {
        [element.uuid]: {
          ...makeInitialElementUIState(),
          pipelineMap: getPipelineMap(element.extension.blockPipeline),
          activeNodeId: element.extension.blockPipeline[0].instanceId,
        },
      },
    };
    const newState = produce(state, (draft) => {
      ensureElementUIState(draft, element.uuid);
    });
    expect(newState).toEqual(state);
  });

  test("adds ui state when not present", () => {
    const element = formStateFactory();
    const state: EditorState = {
      ...initialState,
      elements: [element],
    };
    const newState = produce(state, (draft) => {
      ensureElementUIState(draft, element.uuid);
    });

    expect(newState.elementUIStates).toContainKey(element.uuid);
  });
});

describe("ensureNodeUIState", () => {
  test("does not affect existing node state", () => {
    const element = formStateFactory();
    const nodeId = element.extension.blockPipeline[0].instanceId;
    const uiState: ElementUIState = {
      ...makeInitialElementUIState(),
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
    const uiState: ElementUIState = {
      ...makeInitialElementUIState(),
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
    const uiState: ElementUIState = {
      ...makeInitialElementUIState(),
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
      elements: [element],
      elementUIStates: {
        [element.uuid]: uiState,
      },
      activeElementId: element.uuid,
    };
    const newEditorState = produce(editorState, (draft) => {
      syncElementNodeUIStates(draft, element);
    });

    expect(selectActiveNodeId({ editor: newEditorState })).toEqual(
      FOUNDATION_NODE_ID
    );
    expect(
      newEditorState.elementUIStates[element.uuid].nodeUIStates
    ).not.toContainKey(invalidNodeId);
  });

  test("adds missing node states", () => {
    const element = formStateFactory();
    const node1Id = element.extension.blockPipeline[0].instanceId;
    const uiState: ElementUIState = {
      ...makeInitialElementUIState(),
      pipelineMap: getPipelineMap(element.extension.blockPipeline),
      activeNodeId: node1Id,
    };
    const editorState: EditorState = {
      ...initialState,
      elements: [element],
      elementUIStates: {
        [element.uuid]: uiState,
      },
    };
    const newEditorState = produce(editorState, (draft) => {
      syncElementNodeUIStates(draft, element);
    });

    // Maintains the foundation node state and adds the block node state for both blocks in the pipeline
    expect(
      newEditorState.elementUIStates[element.uuid].nodeUIStates
    ).toContainKey(FOUNDATION_NODE_ID);
    expect(
      newEditorState.elementUIStates[element.uuid].nodeUIStates
    ).toContainKey(node1Id);
    const node2Id = element.extension.blockPipeline[1].instanceId;
    expect(
      newEditorState.elementUIStates[element.uuid].nodeUIStates
    ).toContainKey(node2Id);
  });
});

describe("setActiveNodeId", () => {
  test("sets active node when node state is missing", () => {
    const element = formStateFactory();
    const nodeId = element.extension.blockPipeline[0].instanceId;
    const uiState: ElementUIState = {
      ...makeInitialElementUIState(),
      pipelineMap: getPipelineMap(element.extension.blockPipeline),
    };
    const editorState: EditorState = {
      ...initialState,
      elements: [element],
      elementUIStates: {
        [element.uuid]: uiState,
      },
      activeElementId: element.uuid,
    };
    const newEditorState = produce(editorState, (draft) => {
      setActiveNodeId(draft, nodeId);
    });

    expect(selectActiveNodeId({ editor: newEditorState })).toEqual(nodeId);
  });

  test("sets active node when node state is already present", () => {
    const element = formStateFactory();
    const nodeId = element.extension.blockPipeline[0].instanceId;
    const uiState: ElementUIState = {
      ...makeInitialElementUIState(),
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
      elements: [element],
      elementUIStates: {
        [element.uuid]: uiState,
      },
      activeElementId: element.uuid,
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
      elements: [element],
      activeElementId: element.uuid,
      dirty: {
        [element.uuid]: true,
      },
      elementUIStates: {
        [element.uuid]: {
          ...makeInitialElementUIState(),
          pipelineMap: getPipelineMap(element.extension.blockPipeline),
          activeNodeId: element.extension.blockPipeline[0].instanceId,
        },
      },
      showV3UpgradeMessageByElement: {
        [element.uuid]: true,
      },
      availableDynamicIds: [element.uuid],
    };

    const newState = produce(state, (draft) => {
      removeElement(draft, element.uuid);
    });
    expect(selectActiveElementId({ editor: newState })).toBeNull();
    expect(selectElements({ editor: newState })).not.toContain(element);
    expect(newState.dirty).not.toContainKey(element.uuid);
    expect(newState.elementUIStates).not.toContainKey(element.uuid);
    expect(newState.showV3UpgradeMessageByElement).not.toContainKey(
      element.uuid
    );
  });

  test("removes inactive and unavailable element", () => {
    const availableElement = formStateFactory();
    const unavailableElement = formStateFactory();
    const state: EditorState = {
      ...initialState,
      elements: [availableElement, unavailableElement],
      activeElementId: availableElement.uuid,
      dirty: {
        [availableElement.uuid]: false,
        [unavailableElement.uuid]: true,
      },
      elementUIStates: {
        [availableElement.uuid]: {
          ...makeInitialElementUIState(),
          pipelineMap: getPipelineMap(availableElement.extension.blockPipeline),
          activeNodeId: availableElement.extension.blockPipeline[0].instanceId,
        },
        [unavailableElement.uuid]: {
          ...makeInitialElementUIState(),
          pipelineMap: getPipelineMap(
            unavailableElement.extension.blockPipeline
          ),
          activeNodeId:
            unavailableElement.extension.blockPipeline[0].instanceId,
        },
      },
      showV3UpgradeMessageByElement: {
        [unavailableElement.uuid]: true,
      },
      availableDynamicIds: [availableElement.uuid],
      unavailableDynamicCount: 1,
    };

    const newState = produce(state, (draft) => {
      removeElement(draft, unavailableElement.uuid);
    });
    expect(selectActiveElementId({ editor: newState })).toEqual(
      availableElement.uuid
    );
    expect(selectElements({ editor: newState })).not.toContain(
      unavailableElement
    );
    expect(newState.dirty).not.toContainKey(unavailableElement.uuid);
    expect(newState.elementUIStates).not.toContainKey(unavailableElement.uuid);
    expect(newState.showV3UpgradeMessageByElement).not.toContainKey(
      unavailableElement.uuid
    );
  });
});

describe("removeRecipeData", () => {
  test("removes expanded active recipe", () => {
    const recipe = installedRecipeMetadataFactory();
    const element1 = formStateFactory({ recipe });
    const element2 = formStateFactory({ recipe });
    const orphanElement = formStateFactory();
    const state: EditorState = {
      ...initialState,
      elements: [element1, element2, orphanElement],
      activeRecipeId: recipe.id,
      expandedRecipeId: recipe.id,
      dirty: {
        [element2.uuid]: true,
        [orphanElement.uuid]: false,
      },
      elementUIStates: {
        [element1.uuid]: {
          ...makeInitialElementUIState(),
          pipelineMap: getPipelineMap(element1.extension.blockPipeline),
          activeNodeId: element1.extension.blockPipeline[0].instanceId,
        },
        [element2.uuid]: {
          ...makeInitialElementUIState(),
          pipelineMap: getPipelineMap(element2.extension.blockPipeline),
          activeNodeId: element2.extension.blockPipeline[0].instanceId,
        },
        [orphanElement.uuid]: {
          ...makeInitialElementUIState(),
          pipelineMap: getPipelineMap(orphanElement.extension.blockPipeline),
          activeNodeId: orphanElement.extension.blockPipeline[0].instanceId,
        },
      },
      showV3UpgradeMessageByElement: {
        [element1.uuid]: true,
      },
      availableDynamicIds: [element1.uuid, orphanElement.uuid],
      dirtyRecipeOptionsById: {
        [recipe.id]: {
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
      dirtyRecipeMetadataById: {
        [recipe.id]: {
          ...recipe,
          description: "new description",
        },
      },
      deletedElementsByRecipeId: {
        [recipe.id]: [element2],
      },
    };

    const newState = produce(state, (draft) => {
      removeElement(draft, element1.uuid);
      removeElement(draft, element2.uuid);
      removeRecipeData(draft, recipe.id);
    });
    expect(selectActiveRecipeId({ editor: newState })).toBeNull();
    expect(selectExpandedRecipeId({ editor: newState })).toBeNull();
    expect(
      selectDirtyOptionDefinitionsForRecipeId(recipe.id)({ editor: newState })
    ).toBeUndefined();
    expect(
      selectDirtyMetadataForRecipeId(recipe.id)({ editor: newState })
    ).toBeUndefined();
    expect(
      selectDeletedElements({ editor: newState })[recipe.id]
    ).toBeUndefined();
  });
});

describe("selectRecipeId", () => {
  test("select unselected recipe", () => {
    const recipe = installedRecipeMetadataFactory();
    const state: EditorState = initialState;
    const newState = produce(state, (draft) => {
      selectRecipeId(draft, recipe.id);
    });
    expect(selectActiveRecipeId({ editor: newState })).toEqual(recipe.id);
    expect(selectExpandedRecipeId({ editor: newState })).toEqual(recipe.id);
  });

  test("re-select selected recipe", () => {
    const recipe = installedRecipeMetadataFactory();
    const state: EditorState = {
      ...initialState,
      activeRecipeId: recipe.id,
      expandedRecipeId: recipe.id,
    };
    const newState = produce(state, (draft) => {
      selectRecipeId(draft, recipe.id);
    });
    expect(selectActiveRecipeId({ editor: newState })).toEqual(recipe.id);
    expect(selectExpandedRecipeId({ editor: newState })).toBeNull();
  });
});
