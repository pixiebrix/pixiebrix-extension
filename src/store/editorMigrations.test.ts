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
  type EditorStateV1,
  type EditorStateV2,
  type EditorStateV3,
  type EditorStateV4,
  type EditorStateV5,
  type EditorStateV6,
  type EditorStateV7,
  type EditorStateV8,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { cloneDeep, mapValues, omit } from "lodash";
import {
  formStateFactory,
  type InternalFormStateOverride,
} from "@/testUtils/factories/pageEditorFactories";
import {
  type IntegrationDependencyV1,
  type IntegrationDependencyV2,
} from "@/integrations/integrationTypes";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import {
  autoUUIDSequence,
  uuidSequence,
} from "@/testUtils/factories/stringFactories";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { validateRegistryId } from "@/types/helpers";
import {
  type BaseFormStateV1,
  type BaseFormStateV2,
  type BaseFormStateV3,
  type BaseFormStateV4,
  type BaseFormStateV5,
  type BaseModComponentStateV1,
  type BaseModComponentStateV2,
} from "@/pageEditor/store/editor/baseFormStateTypes";
import { type PersistedState } from "redux-persist";
import {
  migrateEditorStateV1,
  migrateEditorStateV2,
  migrateEditorStateV3,
  migrateEditorStateV4,
  migrateEditorStateV5,
  migrateEditorStateV6,
  migrateEditorStateV7,
} from "@/store/editorMigrations";
import { type FactoryConfig } from "cooky-cutter/dist/define";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import {
  FOUNDATION_NODE_ID,
  makeInitialBrickPipelineUIState,
} from "@/pageEditor/store/editor/uiState";

const initialStateV1: EditorStateV1 & PersistedState = {
  selectionSeq: 0,
  activeElementId: null,
  activeRecipeId: null,
  expandedRecipeId: null,
  error: null,
  beta: false,
  elements: [],
  knownEditable: [],
  dirty: {},
  isBetaUI: false,
  elementUIStates: {},
  dirtyRecipeOptionsById: {},
  dirtyRecipeMetadataById: {},
  visibleModalKey: null,
  keepLocalCopyOnCreateRecipe: false,
  deletedElementsByRecipeId: {},
  availableInstalledIds: [],
  isPendingInstalledExtensions: false,
  availableDynamicIds: [],
  isPendingDynamicExtensions: false,
  isModListExpanded: true,
  isDataPanelExpanded: true,
  isDimensionsWarningDismissed: false,
  inserting: null,
  isVariablePopoverVisible: false,
  _persist: {
    version: 1,
    rehydrated: false,
  },
};

const initialStateV2: EditorStateV2 & PersistedState = {
  ...omit(initialStateV1, "elements", "deletedElementsByRecipeId"),
  elements: [],
  deletedElementsByRecipeId: {},
  // Function under test does not handle updating the persistence, this is handled by redux-persist
  _persist: {
    version: 1,
    rehydrated: false,
  },
};

const initialStateV3: EditorStateV3 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  beta: false,
  modComponentFormStates: [],
  knownEditableBrickIds: [],
  dirty: {},
  isBetaUI: false,
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModalKey: null,
  addBrickLocation: undefined,
  keepLocalCopyOnCreateMod: false,
  deletedModComponentFormStatesByModId: {},
  availableActivatedModComponentIds: [],
  isPendingAvailableActivatedModComponents: false,
  availableDraftModComponentIds: [],
  isPendingDraftModComponents: false,
  isModListExpanded: true,
  isDataPanelExpanded: true,
  isDimensionsWarningDismissed: false,
  inserting: null,
  isVariablePopoverVisible: false,
  // Function under test does not handle updating the persistence, this is handled by redux-persist
  _persist: {
    version: 1,
    rehydrated: false,
  },
};

const initialStateV4: EditorStateV4 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  beta: false,
  modComponentFormStates: [],
  knownEditableBrickIds: [],
  dirty: {},
  isBetaUI: false,
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModalKey: null,
  addBrickLocation: undefined,
  keepLocalCopyOnCreateMod: false,
  deletedModComponentFormStatesByModId: {},
  availableActivatedModComponentIds: [],
  isPendingAvailableActivatedModComponents: false,
  availableDraftModComponentIds: [],
  isPendingDraftModComponents: false,
  isModListExpanded: true,
  isDataPanelExpanded: true,
  isDimensionsWarningDismissed: false,
  inserting: null,
  isVariablePopoverVisible: false,
  // Function under test does not handle updating the persistence, this is handled by redux-persist
  _persist: {
    version: 1,
    rehydrated: false,
  },
};

const initialStateV5: EditorStateV5 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  beta: false,
  modComponentFormStates: [],
  knownEditableBrickIds: [],
  dirty: {},
  isBetaUI: false,
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModalKey: null,
  addBrickLocation: undefined,
  keepLocalCopyOnCreateMod: false,
  deletedModComponentFormStatesByModId: {},
  availableActivatedModComponentIds: [],
  isPendingAvailableActivatedModComponents: false,
  availableDraftModComponentIds: [],
  isPendingDraftModComponents: false,
  isModListExpanded: true,
  isDataPanelExpanded: true,
  isDimensionsWarningDismissed: false,
  insertingStarterBrickType: null,
  isVariablePopoverVisible: false,
  // Function under test does not handle updating the persistence, this is handled by redux-persist
  _persist: {
    version: 1,
    rehydrated: false,
  },
};

const initialStateV6: EditorStateV6 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  beta: false,
  modComponentFormStates: [],
  knownEditableBrickIds: [],
  dirty: {},
  isBetaUI: false,
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModalKey: null,
  addBrickLocation: undefined,
  keepLocalCopyOnCreateMod: false,
  deletedModComponentFormStatesByModId: {},
  availableActivatedModComponentIds: [],
  isPendingAvailableActivatedModComponents: false,
  availableDraftModComponentIds: [],
  isPendingDraftModComponents: false,
  isModListExpanded: true,
  isDataPanelExpanded: true,
  isDimensionsWarningDismissed: false,
  isVariablePopoverVisible: false,
  // Function under test does not handle updating the persistence, this is handled by redux-persist
  _persist: {
    version: 1,
    rehydrated: false,
  },
};

const initialStateV7: EditorStateV7 & PersistedState =
  cloneDeep(initialStateV6);

const initialStateV8: EditorStateV8 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  beta: false,
  modComponentFormStates: [],
  knownEditableBrickIds: [],
  dirty: {},
  isBetaUI: false,
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModalKey: null,
  addBrickLocation: undefined,
  keepLocalCopyOnCreateMod: false,
  deletedModComponentFormStatesByModId: {},
  availableActivatedModComponentIds: [],
  isPendingAvailableActivatedModComponents: false,
  availableDraftModComponentIds: [],
  isPendingDraftModComponents: false,
  isModListExpanded: true,
  isDataPanelExpanded: true,
  isDimensionsWarningDismissed: false,
  isVariablePopoverVisible: false,
  // Function under test does not handle updating the persistence, this is handled by redux-persist
  _persist: {
    version: 1,
    rehydrated: false,
  },
};

function unmigrateServices(
  integrationDependencies: IntegrationDependencyV2[] = [],
): IntegrationDependencyV1[] {
  return integrationDependencies.map(
    ({ integrationId, outputKey, configId, isOptional, apiVersion }) => ({
      id: integrationId,
      outputKey,
      config: configId,
      isOptional,
      apiVersion,
    }),
  );
}

function unmigrateFormStateV2toV1(formState: BaseFormStateV2): BaseFormStateV1 {
  return {
    ...omit(formState, "integrationDependencies"),
    services: unmigrateServices(formState.integrationDependencies),
  };
}

function unmigrateDeletedElements(
  deletedElements: Record<string, BaseFormStateV2[]>,
): Record<string, BaseFormStateV1[]> {
  return mapValues(deletedElements, (formStates) =>
    formStates.map((formState) => unmigrateFormStateV2toV1(formState)),
  );
}

function unmigrateEditorStateV2toV1(
  state: EditorStateV2 & PersistedState,
): EditorStateV1 & PersistedState {
  return {
    ...omit(state, "elements", "deletedElementsByRecipeId"),
    elements: state.elements.map((element) =>
      unmigrateFormStateV2toV1(element),
    ),
    deletedElementsByRecipeId: unmigrateDeletedElements(
      state.deletedElementsByRecipeId,
    ),
  };
}

function unmigrateModComponentStateV2toV1(
  state: BaseModComponentStateV2,
): BaseModComponentStateV1 {
  return {
    blockPipeline: state.brickPipeline,
  };
}

function unmigrateFormStateV3toV2(formState: BaseFormStateV3): BaseFormStateV2 {
  return {
    ...omit(formState, ["modMetadata", "modComponent", "starterBrick"]),
    recipe: formState.modMetadata,
    extension: unmigrateModComponentStateV2toV1(formState.modComponent),
    extensionPoint: formState.starterBrick,
  };
}

function unmigrateEditorStateV3toV2(
  state: EditorStateV3 & PersistedState,
): EditorStateV2 & PersistedState {
  return {
    ...omit(
      state,
      "activeModComponentId",
      "activeModId",
      "expandedModId",
      "modComponentFormStates",
      "knownEditableBrickIds",
      "brickPipelineUIStateById",
      "copiedBrick",
      "dirtyModOptionsById",
      "dirtyModMetadataById",
      "addBrickLocation",
      "keepLocalCopyOnCreateMod",
      "deletedModComponentFormStatesByModId",
      "availableActivatedModComponentIds",
      "isPendingAvailableActivatedModComponents",
      "availableDraftModComponentIds",
      "isPendingDraftModComponents",
    ),
    activeElementId: state.activeModComponentId,
    activeRecipeId: state.activeModId,
    expandedRecipeId: state.expandedModId,
    elements: state.modComponentFormStates,
    knownEditable: state.knownEditableBrickIds,
    elementUIStates: state.brickPipelineUIStateById,
    copiedBlock: state.copiedBrick,
    dirtyRecipeOptionsById: state.dirtyModOptionsById,
    dirtyRecipeMetadataById: state.dirtyModMetadataById,
    addBlockLocation: state.addBrickLocation,
    keepLocalCopyOnCreateRecipe: state.keepLocalCopyOnCreateMod,
    deletedElementsByRecipeId: state.deletedModComponentFormStatesByModId,
    availableInstalledIds: state.availableActivatedModComponentIds,
    isPendingInstalledExtensions:
      state.isPendingAvailableActivatedModComponents,
    availableDynamicIds: state.availableDraftModComponentIds,
    isPendingDynamicExtensions: state.isPendingDraftModComponents,
  };
}

function unmigrateEditorStateV4toV3(
  state: EditorStateV4 & PersistedState,
): EditorStateV3 & PersistedState {
  return {
    ...omit(
      state,
      "modComponentFormStates",
      "deletedModComponentFormStatesByModId",
    ),
    modComponentFormStates: state.modComponentFormStates.map((formState) =>
      unmigrateFormStateV3toV2(formState),
    ),
    deletedModComponentFormStatesByModId: mapValues(
      state.deletedModComponentFormStatesByModId,
      (formStates) =>
        formStates.map((formState) => unmigrateFormStateV3toV2(formState)),
    ),
  };
}

function unmigrateFormStateV4toV3(formState: BaseFormStateV4): BaseFormStateV3 {
  return {
    ...formState,
    type: formState.starterBrick.definition.type,
  };
}

function unmigrateFormStateV5toV4(formState: BaseFormStateV5): BaseFormStateV4 {
  return omit(formState, "variablesDefinition");
}

function unmigrateEditorStateV5toV4(
  state: EditorStateV5 & PersistedState,
): EditorStateV4 & PersistedState {
  return {
    ...omit(
      state,
      "insertingStarterBrickType",
      "modComponentFormStates",
      "deletedModComponentFormStatesByModId",
    ),
    inserting: state.insertingStarterBrickType,
    modComponentFormStates: state.modComponentFormStates.map((formState) =>
      unmigrateFormStateV4toV3(formState),
    ),
    deletedModComponentFormStatesByModId: mapValues(
      state.deletedModComponentFormStatesByModId,
      (formStates) =>
        formStates.map((formState) => unmigrateFormStateV4toV3(formState)),
    ),
  };
}

function unmigrateEditorStateV6toV5(
  state: EditorStateV6 & PersistedState,
): EditorStateV5 & PersistedState {
  return {
    ...state,
    insertingStarterBrickType: null,
  };
}

function unmigrateEditorStateV8toV7(
  state: EditorStateV8 & PersistedState,
): EditorStateV7 & PersistedState {
  return {
    ...omit(
      state,
      "modComponentFormStates",
      "deletedModComponentFormStatesByModId",
    ),
    modComponentFormStates: state.modComponentFormStates.map((formState) =>
      unmigrateFormStateV5toV4(formState),
    ),
    deletedModComponentFormStatesByModId: mapValues(
      state.deletedModComponentFormStatesByModId,
      (formStates) =>
        formStates.map((formState) => unmigrateFormStateV5toV4(formState)),
    ),
  };
}

type SimpleFactory<T> = (override?: FactoryConfig<T>) => T;

const formStateFactoryV5: SimpleFactory<BaseFormStateV5> = (override) =>
  formStateFactory({
    formStateConfig: override as FactoryConfig<InternalFormStateOverride>,
  });

const formStateFactoryV4: SimpleFactory<BaseFormStateV4> = (override) =>
  unmigrateFormStateV5toV4(formStateFactoryV5());

const formStateFactoryV3: SimpleFactory<BaseFormStateV3> = () =>
  unmigrateFormStateV4toV3(formStateFactoryV4());

const formStateFactoryV2: SimpleFactory<BaseFormStateV2> = () =>
  unmigrateFormStateV3toV2(formStateFactoryV3());

describe("editor state migrations", () => {
  describe("migrateEditorState V1 to V2", () => {
    it("migrates initial state", () => {
      expect(migrateEditorStateV1(initialStateV1)).toStrictEqual(
        initialStateV2,
      );
    });

    it("migrates state with elements with no services", () => {
      const expectedState = {
        ...initialStateV2,
        elements: [formStateFactoryV2(), formStateFactoryV2()],
      };
      const unmigrated = unmigrateEditorStateV2toV1(expectedState);
      expect(migrateEditorStateV1(unmigrated)).toStrictEqual(expectedState);
    });

    it("migrates state with elements with services and deleted elements", () => {
      const fooElement1 = formStateFactoryV2({
        recipe: modMetadataFactory({
          id: validateRegistryId("foo"),
        }),
        integrationDependencies: [
          integrationDependencyFactory({
            configId: uuidSequence,
          }),
          integrationDependencyFactory({
            configId: uuidSequence,
          }),
        ],
      });
      const fooElement2 = formStateFactoryV2({
        recipe: modMetadataFactory({
          id: validateRegistryId("foo"),
        }),
        integrationDependencies: [
          integrationDependencyFactory({
            configId: uuidSequence,
          }),
          integrationDependencyFactory({
            configId: uuidSequence,
          }),
        ],
      });
      const barElement = formStateFactoryV2({
        recipe: modMetadataFactory({
          id: validateRegistryId("bar"),
        }),
        integrationDependencies: [
          integrationDependencyFactory({
            configId: uuidSequence,
          }),
          integrationDependencyFactory({
            configId: uuidSequence,
          }),
        ],
      });
      const expectedState = {
        ...initialStateV2,
        elements: [
          formStateFactoryV2({
            integrationDependencies: [
              integrationDependencyFactory({
                configId: uuidSequence,
              }),
            ],
          }),
          fooElement1,
          fooElement2,
          barElement,
        ],
        deletedElementsByRecipeId: {
          foo: [fooElement1, fooElement2],
          bar: [barElement],
        },
      };
      const unmigrated = unmigrateEditorStateV2toV1(expectedState);
      expect(migrateEditorStateV1(unmigrated)).toStrictEqual(expectedState);
    });
  });

  describe("migrateEditorState V2 to V3", () => {
    it("migrates initial state", () => {
      expect(migrateEditorStateV2(initialStateV2)).toStrictEqual(
        initialStateV3,
      );
    });

    it("migrates the form states", () => {
      const formStateV2 = formStateFactoryV2();
      const expectedEditorStateV3: EditorStateV3 & PersistedState = {
        ...initialStateV3,
        modComponentFormStates: [formStateV2],
      };
      const unmigrated = unmigrateEditorStateV3toV2(expectedEditorStateV3);
      expect(migrateEditorStateV2(unmigrated)).toStrictEqual(
        expectedEditorStateV3,
      );
    });
  });

  describe("migrateEditorState V3 to V4", () => {
    it("migrates initial state", () => {
      expect(migrateEditorStateV3(initialStateV3)).toStrictEqual(
        initialStateV4,
      );
    });

    it("migrates the form states", () => {
      const formStateV3 = formStateFactoryV3();
      const expectedEditorStateV4: EditorStateV4 & PersistedState = {
        ...initialStateV4,
        modComponentFormStates: [formStateV3],
      };
      const unmigrated = unmigrateEditorStateV4toV3(expectedEditorStateV4);
      expect(migrateEditorStateV3(unmigrated)).toStrictEqual(
        expectedEditorStateV4,
      );
    });
  });

  describe("migrateEditorState V4 to V5", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV4(initialStateV4)).toStrictEqual(
        initialStateV5,
      );
    });

    it("migrates the inserting field and the form states", () => {
      const expectedEditorStateV5: EditorStateV5 & PersistedState = {
        ...initialStateV5,
        insertingStarterBrickType: StarterBrickTypes.BUTTON,
        modComponentFormStates: [formStateFactoryV4(), formStateFactoryV4()],
      };
      const unmigrated = unmigrateEditorStateV5toV4(expectedEditorStateV5);
      expect(migrateEditorStateV4(unmigrated)).toStrictEqual(
        expectedEditorStateV5,
      );
    });
  });

  describe("migrateEditorState V5 to V6", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV5(initialStateV5)).toStrictEqual(
        initialStateV6,
      );
    });

    it("migrates remove insertingStarterBrickType property", () => {
      const { insertingStarterBrickType, ...rest } = initialStateV5;
      const expectedEditorStateV6: EditorStateV6 & PersistedState = rest;
      const unmigrated = unmigrateEditorStateV6toV5(expectedEditorStateV6);
      expect(migrateEditorStateV5(unmigrated)).toStrictEqual(
        expectedEditorStateV6,
      );
    });
  });

  describe("migrateEditorState V6 to V7", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV6(initialStateV6)).toStrictEqual(
        initialStateV7,
      );
    });

    it("resets data panel shape", () => {
      const componentId = autoUUIDSequence();
      const initial = cloneDeep(initialStateV6);

      initial.brickPipelineUIStateById[componentId] =
        makeInitialBrickPipelineUIState();

      initial.brickPipelineUIStateById[componentId]!.nodeUIStates[
        FOUNDATION_NODE_ID
      ]!.dataPanel = {
        // Exact shape doesn't matter here. Just testing that the migration resets the state
        activeTabKey: "context" as any,
        foo: {},
      } as any;

      const result = migrateEditorStateV6(initial);

      expect(
        result.brickPipelineUIStateById[componentId]!.nodeUIStates[
          FOUNDATION_NODE_ID
        ]!.dataPanel,
      ).toStrictEqual(
        expect.objectContaining({
          activeTabKey: null,
          input: expect.toBeObject(),
        }),
      );
    });
  });

  describe("migrateEditorState V7 to V8", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV7(initialStateV7)).toStrictEqual(
        initialStateV8,
      );
    });

    it("add variable definitions section", () => {
      const expectedEditorStateV8: EditorStateV8 & PersistedState = {
        ...initialStateV8,
        modComponentFormStates: [formStateFactoryV5()],
      };
      const unmigrated = unmigrateEditorStateV8toV7(expectedEditorStateV8);
      expect(migrateEditorStateV7(unmigrated)).toStrictEqual(
        expectedEditorStateV8,
      );
    });
  });
});
