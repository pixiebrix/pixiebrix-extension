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

import { type EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { initialState } from "@/pageEditor/store/editor/editorSlice";
import { type UUID } from "@/types/stringTypes";
import { type BrickConfigurationUIState } from "@/pageEditor/store/editor/uiStateTypes";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import {
  getEditorState,
  removeDraftModComponentsForMod,
  saveEditorState,
} from "@/store/editorStorage";
import { validateRegistryId } from "@/types/helpers";

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

describe("editorStorage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("removes active mod", async () => {
    const mod = modMetadataFactory();
    const formState1 = formStateFactory({
      formStateConfig: {
        modMetadata: mod,
      },
    });
    const formState1BrickConfigurationUIStates: Record<
      UUID,
      BrickConfigurationUIState
    > = {
      [formState1.uuid]: {
        nodeId: formState1.modComponent.brickPipeline[0]!.instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const formState2 = formStateFactory({
      formStateConfig: {
        modMetadata: mod,
      },
    });
    const formState2BrickConfigurationUIStates: Record<
      UUID,
      BrickConfigurationUIState
    > = {
      [formState2.uuid]: {
        nodeId: formState2.modComponent.brickPipeline[0]!.instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const formState3 = formStateFactory();
    const formState3BrickConfigurationUIStates: Record<
      UUID,
      BrickConfigurationUIState
    > = {
      [formState3.uuid]: {
        nodeId: formState3.modComponent.brickPipeline[1]!.instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      modComponentFormStates: [formState3],
      brickPipelineUIStateById: {
        [formState3.uuid]: {
          pipelineMap: getPipelineMap(formState3.modComponent.brickPipeline),
          activeNodeId: formState3.modComponent.brickPipeline[0]!.instanceId!,
          nodeUIStates: formState3BrickConfigurationUIStates,
        },
      },
      availableDraftModComponentIds: [formState3.uuid],
    };
    const stateWithMod: EditorState = {
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
          pipelineMap: getPipelineMap(formState1.modComponent.brickPipeline),
          activeNodeId: formState1.modComponent.brickPipeline[1]!.instanceId,
          nodeUIStates: formState1BrickConfigurationUIStates,
        },
        [formState2.uuid]: {
          pipelineMap: getPipelineMap(formState2.modComponent.brickPipeline),
          activeNodeId: formState2.modComponent.brickPipeline[0]!.instanceId,
          nodeUIStates: formState2BrickConfigurationUIStates,
        },
      },
      availableDraftModComponentIds: [
        ...baseState.availableDraftModComponentIds,
        formState1.uuid,
        formState2.uuid,
      ],
    };
    readReduxStorageMock.mockResolvedValue(stateWithMod);

    await removeDraftModComponentsForMod(mod.id);

    expect(setReduxStorage).toHaveBeenCalledWith(
      "persist:editor",
      baseState,
      currentPersistenceVersion,
    );
  });

  test("removes inactive mod", async () => {
    const mod = modMetadataFactory();
    const formState1 = formStateFactory({
      formStateConfig: {
        modMetadata: mod,
      },
    });
    const formState1BrickConfigurationUIStates: Record<
      UUID,
      BrickConfigurationUIState
    > = {
      [formState1.uuid]: {
        nodeId: formState1.modComponent.brickPipeline[0]!.instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const formState2 = formStateFactory({
      formStateConfig: {
        modMetadata: mod,
      },
    });
    const formState2BrickConfigurationUIStates: Record<
      UUID,
      BrickConfigurationUIState
    > = {
      [formState2.uuid]: {
        nodeId: formState2.modComponent.brickPipeline[0]!.instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const formState3 = formStateFactory();
    const formState3BrickConfigurationUIStates: Record<
      UUID,
      BrickConfigurationUIState
    > = {
      [formState3.uuid]: {
        nodeId: formState3.modComponent.brickPipeline[1]!.instanceId,
        dataPanel: {
          activeTabKey: null,
        },
      } as BrickConfigurationUIState,
    };
    const baseState: EditorState = {
      ...initialState,
      activeModComponentId: formState3.uuid,
      modComponentFormStates: [formState3],
      brickPipelineUIStateById: {
        [formState3.uuid]: {
          pipelineMap: getPipelineMap(formState3.modComponent.brickPipeline),
          activeNodeId: formState3.modComponent.brickPipeline[0]!.instanceId!,
          nodeUIStates: formState3BrickConfigurationUIStates,
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
          pipelineMap: getPipelineMap(formState1.modComponent.brickPipeline),
          activeNodeId: formState1.modComponent.brickPipeline[1]!.instanceId,
          nodeUIStates: formState1BrickConfigurationUIStates,
        },
        [formState2.uuid]: {
          pipelineMap: getPipelineMap(formState2.modComponent.brickPipeline),
          activeNodeId: formState2.modComponent.brickPipeline[0]!.instanceId,
          nodeUIStates: formState2BrickConfigurationUIStates,
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
      await saveEditorState(state as unknown as EditorState);
      expect(setReduxStorageMock).not.toHaveBeenCalled();
    },
  );

  test("removeDraftModComponentsForMod doesn't crash when readReduxStorage returns undefined", async () => {
    await removeDraftModComponentsForMod(validateRegistryId("@test/recipe"));
  });
});
