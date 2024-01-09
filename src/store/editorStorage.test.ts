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
import { type UUID } from "@/types/stringTypes";
import { type NodeUIState } from "@/pageEditor/uiState/uiStateTypes";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import {
  getEditorState,
  removeDynamicElements,
  removeDynamicElementsForRecipe,
  saveEditorState,
} from "@/store/editorStorage";
import { validateRegistryId } from "@/types/helpers";

import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { readReduxStorage, setReduxStorage } from "@/utils/storageUtils";
import { getMaxMigrationsVersion } from "@/store/migratePersistedState";
import { migrations } from "@/store/editorMigrations";

jest.mock("@/utils/storageUtils", () => {
  const actual = jest.requireActual("@/utils/storageUtils");

  return {
    ...actual,
    readReduxStorage: jest.fn(),
    setReduxStorage: jest.fn(),
  };
});

const readReduxStorageMock = jest.mocked(readReduxStorage);
const setReduxStorageMock = jest.mocked(setReduxStorage);

const currentPersistenceVersion = getMaxMigrationsVersion(migrations);

describe("dynamicElementStorage", () => {
  test("removes one active element", async () => {
    const element = formStateFactory();
    const nodeUIStates: Record<UUID, NodeUIState> = {
      [element.uuid]: {
        nodeId: element.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const state: EditorState = {
      ...initialState,
      activeElementId: element.uuid,
      elements: [element],
      dirty: {
        [element.uuid]: true,
      },
      elementUIStates: {
        [element.uuid]: {
          pipelineMap: getPipelineMap(element.extension.blockPipeline),
          activeNodeId: element.extension.blockPipeline[0].instanceId,
          nodeUIStates,
        },
      },
      availableDynamicIds: [element.uuid],
    };
    readReduxStorageMock.mockResolvedValue(state);

    await removeDynamicElements([element.uuid]);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      initialState,
      currentPersistenceVersion,
    );
  });

  test("removes inactive element", async () => {
    const inactiveElement = formStateFactory();
    const inactiveNodeUIStates: Record<UUID, NodeUIState> = {
      [inactiveElement.uuid]: {
        nodeId: inactiveElement.extension.blockPipeline[1].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const activeElement = formStateFactory();
    const activeNodeUIStates: Record<UUID, NodeUIState> = {
      [activeElement.uuid]: {
        nodeId: activeElement.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      activeElementId: activeElement.uuid,
      elements: [activeElement],
      dirty: {
        [activeElement.uuid]: true,
      },
      elementUIStates: {
        [activeElement.uuid]: {
          pipelineMap: getPipelineMap(activeElement.extension.blockPipeline),
          activeNodeId: activeElement.extension.blockPipeline[0].instanceId,
          nodeUIStates: activeNodeUIStates,
        },
      },
      availableDynamicIds: [activeElement.uuid],
    };
    const stateWithInactive: EditorState = {
      ...baseState,
      elements: [...baseState.elements, inactiveElement],
      elementUIStates: {
        ...baseState.elementUIStates,
        [inactiveElement.uuid]: {
          pipelineMap: getPipelineMap(inactiveElement.extension.blockPipeline),
          activeNodeId: inactiveElement.extension.blockPipeline[0].instanceId,
          nodeUIStates: inactiveNodeUIStates,
        },
      },
      availableDynamicIds: [
        ...baseState.availableDynamicIds,
        inactiveElement.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithInactive);

    await removeDynamicElements([inactiveElement.uuid]);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      baseState,
      currentPersistenceVersion,
    );
  });

  test("removes active recipe", async () => {
    const recipe = modMetadataFactory();
    const element1 = formStateFactory({
      recipe,
    });
    const element1NodeUIStates: Record<UUID, NodeUIState> = {
      [element1.uuid]: {
        nodeId: element1.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const element2 = formStateFactory({
      recipe,
    });
    const element2NodeUIStates: Record<UUID, NodeUIState> = {
      [element2.uuid]: {
        nodeId: element2.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const element3 = formStateFactory();
    const element3NodeUIStates: Record<UUID, NodeUIState> = {
      [element3.uuid]: {
        nodeId: element3.extension.blockPipeline[1].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      elements: [element3],
      elementUIStates: {
        [element3.uuid]: {
          pipelineMap: getPipelineMap(element3.extension.blockPipeline),
          activeNodeId: element3.extension.blockPipeline[0].instanceId,
          nodeUIStates: element3NodeUIStates,
        },
      },
      availableDynamicIds: [element3.uuid],
    };
    const stateWithRecipe: EditorState = {
      ...baseState,
      activeRecipeId: recipe.id,
      elements: [...baseState.elements, element1, element2],
      dirty: {
        [element1.uuid]: true,
      },
      dirtyRecipeMetadataById: {
        [recipe.id]: {
          ...recipe,
          description: "new description",
        },
      },
      elementUIStates: {
        ...baseState.elementUIStates,
        [element1.uuid]: {
          pipelineMap: getPipelineMap(element1.extension.blockPipeline),
          activeNodeId: element1.extension.blockPipeline[1].instanceId,
          nodeUIStates: element1NodeUIStates,
        },
        [element2.uuid]: {
          pipelineMap: getPipelineMap(element2.extension.blockPipeline),
          activeNodeId: element2.extension.blockPipeline[0].instanceId,
          nodeUIStates: element2NodeUIStates,
        },
      },
      availableDynamicIds: [
        ...baseState.availableDynamicIds,
        element1.uuid,
        element2.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithRecipe);

    await removeDynamicElementsForRecipe(recipe.id);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      baseState,
      currentPersistenceVersion,
    );
  });

  test("removes inactive recipe", async () => {
    const recipe = modMetadataFactory();
    const element1 = formStateFactory({
      recipe,
    });
    const element1NodeUIStates: Record<UUID, NodeUIState> = {
      [element1.uuid]: {
        nodeId: element1.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const element2 = formStateFactory({
      recipe,
    });
    const element2NodeUIStates: Record<UUID, NodeUIState> = {
      [element2.uuid]: {
        nodeId: element2.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const element3 = formStateFactory();
    const element3NodeUIStates: Record<UUID, NodeUIState> = {
      [element3.uuid]: {
        nodeId: element3.extension.blockPipeline[1].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      activeElementId: element3.uuid,
      elements: [element3],
      elementUIStates: {
        [element3.uuid]: {
          pipelineMap: getPipelineMap(element3.extension.blockPipeline),
          activeNodeId: element3.extension.blockPipeline[0].instanceId,
          nodeUIStates: element3NodeUIStates,
        },
      },
      availableDynamicIds: [element3.uuid],
    };
    const stateWithRecipe: EditorState = {
      ...baseState,
      elements: [...baseState.elements, element1, element2],
      dirty: {
        [element1.uuid]: true,
      },
      dirtyRecipeMetadataById: {
        [recipe.id]: {
          ...recipe,
          description: "new description",
        },
      },
      elementUIStates: {
        ...baseState.elementUIStates,
        [element1.uuid]: {
          pipelineMap: getPipelineMap(element1.extension.blockPipeline),
          activeNodeId: element1.extension.blockPipeline[1].instanceId,
          nodeUIStates: element1NodeUIStates,
        },
        [element2.uuid]: {
          pipelineMap: getPipelineMap(element2.extension.blockPipeline),
          activeNodeId: element2.extension.blockPipeline[0].instanceId,
          nodeUIStates: element2NodeUIStates,
        },
      },
      availableDynamicIds: [
        ...baseState.availableDynamicIds,
        element1.uuid,
        element2.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithRecipe);

    await removeDynamicElementsForRecipe(recipe.id);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      baseState,
      currentPersistenceVersion,
    );
  });
});

describe("dynamicElementStorage when no state is persisted", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("getEditorState returns undefined when readReduxStorage returns undefined", async () => {
    const state = await getEditorState();
    expect(state).toBeUndefined();
  });

  test.each([undefined, null])(
    "setEditorState is NOP for: %s",
    async (state?: null) => {
      await saveEditorState(state);
      expect(setReduxStorageMock).not.toHaveBeenCalled();
    },
  );

  test("removeDynamicElementsForRecipe doesn't crash when readReduxStorage returns undefined", async () => {
    await removeDynamicElementsForRecipe(validateRegistryId("@test/recipe"));
  });

  test("removeDynamicElements doesn't crash when readReduxStorage returns undefined", async () => {
    await removeDynamicElements([uuidSequence(0), uuidSequence(1)]);
  });
});
