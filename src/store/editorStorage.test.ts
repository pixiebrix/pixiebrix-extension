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
import { type UUID } from "@/types/stringTypes";
import { type BrickConfigurationUIState } from "@/pageEditor/uiState/uiStateTypes";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import {
  getEditorState,
  removeDraftModComponents,
  removeDraftModComponentsForMod,
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

describe("draftModComponentStorage", () => {
  test("removes one active element", async () => {
    const element = formStateFactory();
    const nodeUIStates: Record<UUID, BrickConfigurationUIState> = {
      [element.uuid]: {
        nodeId: element.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const state: EditorState = {
      ...initialState,
      activeModComponentId: element.uuid,
      modComponentFormStates: [element],
      dirty: {
        [element.uuid]: true,
      },
      brickPipelineUIStateById: {
        [element.uuid]: {
          pipelineMap: getPipelineMap(element.extension.blockPipeline),
          activeNodeId: element.extension.blockPipeline[0].instanceId,
          nodeUIStates,
        },
      },
      availableDraftModComponentIds: [element.uuid],
    };
    readReduxStorageMock.mockResolvedValue(state);

    await removeDraftModComponents([element.uuid]);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      initialState,
      currentPersistenceVersion,
    );
  });

  test("removes inactive element", async () => {
    const inactiveElement = formStateFactory();
    const inactiveNodeUIStates: Record<UUID, BrickConfigurationUIState> = {
      [inactiveElement.uuid]: {
        nodeId: inactiveElement.extension.blockPipeline[1].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const activeElement = formStateFactory();
    const activeNodeUIStates: Record<UUID, BrickConfigurationUIState> = {
      [activeElement.uuid]: {
        nodeId: activeElement.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      activeModComponentId: activeElement.uuid,
      modComponentFormStates: [activeElement],
      dirty: {
        [activeElement.uuid]: true,
      },
      brickPipelineUIStateById: {
        [activeElement.uuid]: {
          pipelineMap: getPipelineMap(activeElement.extension.blockPipeline),
          activeNodeId: activeElement.extension.blockPipeline[0].instanceId,
          nodeUIStates: activeNodeUIStates,
        },
      },
      availableDraftModComponentIds: [activeElement.uuid],
    };
    const stateWithInactive: EditorState = {
      ...baseState,
      modComponentFormStates: [
        ...baseState.modComponentFormStates,
        inactiveElement,
      ],
      brickPipelineUIStateById: {
        ...baseState.brickPipelineUIStateById,
        [inactiveElement.uuid]: {
          pipelineMap: getPipelineMap(inactiveElement.extension.blockPipeline),
          activeNodeId: inactiveElement.extension.blockPipeline[0].instanceId,
          nodeUIStates: inactiveNodeUIStates,
        },
      },
      availableDraftModComponentIds: [
        ...baseState.availableDraftModComponentIds,
        inactiveElement.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithInactive);

    await removeDraftModComponents([inactiveElement.uuid]);

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
    const element1NodeUIStates: Record<UUID, BrickConfigurationUIState> = {
      [element1.uuid]: {
        nodeId: element1.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const element2 = formStateFactory({
      recipe,
    });
    const element2NodeUIStates: Record<UUID, BrickConfigurationUIState> = {
      [element2.uuid]: {
        nodeId: element2.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const element3 = formStateFactory();
    const element3NodeUIStates: Record<UUID, BrickConfigurationUIState> = {
      [element3.uuid]: {
        nodeId: element3.extension.blockPipeline[1].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      modComponentFormStates: [element3],
      brickPipelineUIStateById: {
        [element3.uuid]: {
          pipelineMap: getPipelineMap(element3.extension.blockPipeline),
          activeNodeId: element3.extension.blockPipeline[0].instanceId,
          nodeUIStates: element3NodeUIStates,
        },
      },
      availableDraftModComponentIds: [element3.uuid],
    };
    const stateWithRecipe: EditorState = {
      ...baseState,
      activeModId: recipe.id,
      modComponentFormStates: [
        ...baseState.modComponentFormStates,
        element1,
        element2,
      ],
      dirty: {
        [element1.uuid]: true,
      },
      dirtyModMetadataById: {
        [recipe.id]: {
          ...recipe,
          description: "new description",
        },
      },
      brickPipelineUIStateById: {
        ...baseState.brickPipelineUIStateById,
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
      availableDraftModComponentIds: [
        ...baseState.availableDraftModComponentIds,
        element1.uuid,
        element2.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithRecipe);

    await removeDraftModComponentsForMod(recipe.id);

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
    const element1NodeUIStates: Record<UUID, BrickConfigurationUIState> = {
      [element1.uuid]: {
        nodeId: element1.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const element2 = formStateFactory({
      recipe,
    });
    const element2NodeUIStates: Record<UUID, BrickConfigurationUIState> = {
      [element2.uuid]: {
        nodeId: element2.extension.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const element3 = formStateFactory();
    const element3NodeUIStates: Record<UUID, BrickConfigurationUIState> = {
      [element3.uuid]: {
        nodeId: element3.extension.blockPipeline[1].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      activeModComponentId: element3.uuid,
      modComponentFormStates: [element3],
      brickPipelineUIStateById: {
        [element3.uuid]: {
          pipelineMap: getPipelineMap(element3.extension.blockPipeline),
          activeNodeId: element3.extension.blockPipeline[0].instanceId,
          nodeUIStates: element3NodeUIStates,
        },
      },
      availableDraftModComponentIds: [element3.uuid],
    };
    const stateWithRecipe: EditorState = {
      ...baseState,
      modComponentFormStates: [
        ...baseState.modComponentFormStates,
        element1,
        element2,
      ],
      dirty: {
        [element1.uuid]: true,
      },
      dirtyModMetadataById: {
        [recipe.id]: {
          ...recipe,
          description: "new description",
        },
      },
      brickPipelineUIStateById: {
        ...baseState.brickPipelineUIStateById,
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
      availableDraftModComponentIds: [
        ...baseState.availableDraftModComponentIds,
        element1.uuid,
        element2.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithRecipe);

    await removeDraftModComponentsForMod(recipe.id);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      baseState,
      currentPersistenceVersion,
    );
  });
});

describe("draftModComponentStorage when no state is persisted", () => {
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

  test("removeDraftModComponentsForMod doesn't crash when readReduxStorage returns undefined", async () => {
    await removeDraftModComponentsForMod(validateRegistryId("@test/recipe"));
  });

  test("removeDraftModComponents doesn't crash when readReduxStorage returns undefined", async () => {
    await removeDraftModComponents([uuidSequence(0), uuidSequence(1)]);
  });
});
