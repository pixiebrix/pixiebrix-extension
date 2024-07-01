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
import { type NodeUIState } from "@/pageEditor/uiState/uiStateTypes";
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
  test("removes one active form state", async () => {
    const formState = formStateFactory();
    const nodeUIStates: Record<UUID, NodeUIState> = {
      [formState.uuid]: {
        nodeId: formState.modComponent.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const state: EditorState = {
      ...initialState,
      activeModComponentId: formState.uuid,
      modComponentFormStates: [formState],
      dirty: {
        [formState.uuid]: true,
      },
      brickPipelineUIStateById: {
        [formState.uuid]: {
          pipelineMap: getPipelineMap(formState.modComponent.blockPipeline),
          activeNodeId: formState.modComponent.blockPipeline[0].instanceId,
          nodeUIStates,
        },
      },
      availableDraftModComponentIds: [formState.uuid],
    };
    readReduxStorageMock.mockResolvedValue(state);

    await removeDraftModComponents([formState.uuid]);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      initialState,
      currentPersistenceVersion,
    );
  });

  test("removes inactive formState", async () => {
    const inactiveFormState = formStateFactory();
    const inactiveNodeUIStates: Record<UUID, NodeUIState> = {
      [inactiveFormState.uuid]: {
        nodeId: inactiveFormState.modComponent.blockPipeline[1].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const activeFormState = formStateFactory();
    const activeNodeUIStates: Record<UUID, NodeUIState> = {
      [activeFormState.uuid]: {
        nodeId: activeFormState.modComponent.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      activeModComponentId: activeFormState.uuid,
      modComponentFormStates: [activeFormState],
      dirty: {
        [activeFormState.uuid]: true,
      },
      brickPipelineUIStateById: {
        [activeFormState.uuid]: {
          pipelineMap: getPipelineMap(
            activeFormState.modComponent.blockPipeline,
          ),
          activeNodeId:
            activeFormState.modComponent.blockPipeline[0].instanceId,
          nodeUIStates: activeNodeUIStates,
        },
      },
      availableDraftModComponentIds: [activeFormState.uuid],
    };
    const stateWithInactive: EditorState = {
      ...baseState,
      modComponentFormStates: [
        ...baseState.modComponentFormStates,
        inactiveFormState,
      ],
      brickPipelineUIStateById: {
        ...baseState.brickPipelineUIStateById,
        [inactiveFormState.uuid]: {
          pipelineMap: getPipelineMap(
            inactiveFormState.modComponent.blockPipeline,
          ),
          activeNodeId:
            inactiveFormState.modComponent.blockPipeline[0].instanceId,
          nodeUIStates: inactiveNodeUIStates,
        },
      },
      availableDraftModComponentIds: [
        ...baseState.availableDraftModComponentIds,
        inactiveFormState.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithInactive);

    await removeDraftModComponents([inactiveFormState.uuid]);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      baseState,
      currentPersistenceVersion,
    );
  });

  test("removes active recipe", async () => {
    const mod = modMetadataFactory();
    const formState1 = formStateFactory({
      mod,
    });
    const formState1NodeUIStates: Record<UUID, NodeUIState> = {
      [formState1.uuid]: {
        nodeId: formState1.modComponent.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const formState2 = formStateFactory({
      mod,
    });
    const formState2NodeUIStates: Record<UUID, NodeUIState> = {
      [formState2.uuid]: {
        nodeId: formState2.modComponent.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const formState3 = formStateFactory();
    const formState3NodeUIStates: Record<UUID, NodeUIState> = {
      [formState3.uuid]: {
        nodeId: formState3.modComponent.blockPipeline[1].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      modComponentFormStates: [formState3],
      brickPipelineUIStateById: {
        [formState3.uuid]: {
          pipelineMap: getPipelineMap(formState3.modComponent.blockPipeline),
          activeNodeId: formState3.modComponent.blockPipeline[0].instanceId,
          nodeUIStates: formState3NodeUIStates,
        },
      },
      availableDraftModComponentIds: [formState3.uuid],
    };
    const stateWithRecipe: EditorState = {
      ...baseState,
      activeModId: mod.id,
      modComponentFormStates: [
        ...baseState.modComponentFormStates,
        formState1,
        formState2,
      ],
      dirty: {
        [formState1.uuid]: true,
      },
      dirtyModMetadataById: {
        [mod.id]: {
          ...mod,
          description: "new description",
        },
      },
      brickPipelineUIStateById: {
        ...baseState.brickPipelineUIStateById,
        [formState1.uuid]: {
          pipelineMap: getPipelineMap(formState1.modComponent.blockPipeline),
          activeNodeId: formState1.modComponent.blockPipeline[1].instanceId,
          nodeUIStates: formState1NodeUIStates,
        },
        [formState2.uuid]: {
          pipelineMap: getPipelineMap(formState2.modComponent.blockPipeline),
          activeNodeId: formState2.modComponent.blockPipeline[0].instanceId,
          nodeUIStates: formState2NodeUIStates,
        },
      },
      availableDraftModComponentIds: [
        ...baseState.availableDraftModComponentIds,
        formState1.uuid,
        formState2.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithRecipe);

    await removeDraftModComponentsForMod(mod.id);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      baseState,
      currentPersistenceVersion,
    );
  });

  test("removes inactive recipe", async () => {
    const mod = modMetadataFactory();
    const formState1 = formStateFactory({
      mod,
    });
    const formState1NodeUIStates: Record<UUID, NodeUIState> = {
      [formState1.uuid]: {
        nodeId: formState1.modComponent.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const formState2 = formStateFactory({
      mod,
    });
    const formState2NodeUIStates: Record<UUID, NodeUIState> = {
      [formState2.uuid]: {
        nodeId: formState2.modComponent.blockPipeline[0].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const formState3 = formStateFactory();
    const formState3NodeUIStates: Record<UUID, NodeUIState> = {
      [formState3.uuid]: {
        nodeId: formState3.modComponent.blockPipeline[1].instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as NodeUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      activeModComponentId: formState3.uuid,
      modComponentFormStates: [formState3],
      brickPipelineUIStateById: {
        [formState3.uuid]: {
          pipelineMap: getPipelineMap(formState3.modComponent.blockPipeline),
          activeNodeId: formState3.modComponent.blockPipeline[0].instanceId,
          nodeUIStates: formState3NodeUIStates,
        },
      },
      availableDraftModComponentIds: [formState3.uuid],
    };
    const stateWithRecipe: EditorState = {
      ...baseState,
      modComponentFormStates: [
        ...baseState.modComponentFormStates,
        formState1,
        formState2,
      ],
      dirty: {
        [formState1.uuid]: true,
      },
      dirtyModMetadataById: {
        [mod.id]: {
          ...mod,
          description: "new description",
        },
      },
      brickPipelineUIStateById: {
        ...baseState.brickPipelineUIStateById,
        [formState1.uuid]: {
          pipelineMap: getPipelineMap(formState1.modComponent.blockPipeline),
          activeNodeId: formState1.modComponent.blockPipeline[1].instanceId,
          nodeUIStates: formState1NodeUIStates,
        },
        [formState2.uuid]: {
          pipelineMap: getPipelineMap(formState2.modComponent.blockPipeline),
          activeNodeId: formState2.modComponent.blockPipeline[0].instanceId,
          nodeUIStates: formState2NodeUIStates,
        },
      },
      availableDraftModComponentIds: [
        ...baseState.availableDraftModComponentIds,
        formState1.uuid,
        formState2.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithRecipe);

    await removeDraftModComponentsForMod(mod.id);

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
