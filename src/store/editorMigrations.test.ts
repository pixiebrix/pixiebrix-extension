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
  type EditorStateMigratedV12,
  type DraftModState,
  type EditorStateMigratedV1,
  type EditorStateMigratedV10,
  type EditorStateMigratedV11,
  type EditorStateMigratedV2,
  type EditorStateMigratedV3,
  type EditorStateMigratedV4,
  type EditorStateMigratedV5,
  type EditorStateMigratedV6,
  type EditorStateMigratedV7,
  type EditorStateMigratedV8,
  type EditorStateMigratedV9,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { cloneDeep, mapValues, omit, pick } from "lodash";
import {
  draftModStateFactory,
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
import {
  isInnerDefinitionRegistryId,
  validateRegistryId,
} from "@/types/helpers";
import {
  type BaseFormStateV1,
  type BaseFormStateV2,
  type BaseFormStateV3,
  type BaseFormStateV4,
  type BaseFormStateV5,
  type BaseFormStateV6,
  type BaseFormStateV7,
  type BaseFormStateV8,
  type BaseModComponentStateV1,
  type BaseModComponentStateV2,
} from "@/pageEditor/store/editor/baseFormStateTypes";
import { type PersistedState } from "redux-persist";
import {
  migrateEditorStateV1,
  migrateEditorStateV10,
  migrateEditorStateV11,
  migrateEditorStateV2,
  migrateEditorStateV3,
  migrateEditorStateV4,
  migrateEditorStateV5,
  migrateEditorStateV6,
  migrateEditorStateV7,
  migrateEditorStateV8,
  migrateEditorStateV9,
} from "@/store/editorMigrations";
import { type FactoryConfig } from "cooky-cutter/dist/define";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import {
  FOUNDATION_NODE_ID,
  makeInitialBrickPipelineUIState,
} from "@/pageEditor/store/editor/uiState";
import {
  emptyModOptionsDefinitionFactory,
  emptyModVariablesDefinitionFactory,
} from "@/utils/modUtils";
import { propertiesToSchema } from "@/utils/schemaUtils";

const initialStateV1: EditorStateMigratedV1 & PersistedState = {
  selectionSeq: 0,
  activeElementId: null,
  activeRecipeId: null,
  expandedRecipeId: null,
  error: null,
  elements: [],
  dirty: {},
  elementUIStates: {},
  dirtyRecipeOptionsById: {},
  dirtyRecipeMetadataById: {},
  visibleModal: null,
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

const initialStateV2: EditorStateMigratedV2 & PersistedState = {
  ...omit(initialStateV1, "elements", "deletedElementsByRecipeId"),
  elements: [],
  deletedElementsByRecipeId: {},
  // Function under test does not handle updating the persistence, this is handled by redux-persist
  _persist: {
    version: 1,
    rehydrated: false,
  },
};

const initialStateV3: EditorStateMigratedV3 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  modComponentFormStates: [],
  dirty: {},
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModal: null,
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

const initialStateV4: EditorStateMigratedV4 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  modComponentFormStates: [],
  dirty: {},
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModal: null,
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

const initialStateV5: EditorStateMigratedV5 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  modComponentFormStates: [],
  dirty: {},
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModal: null,
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

const initialStateV6: EditorStateMigratedV6 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  modComponentFormStates: [],
  dirty: {},
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModal: null,
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

const initialStateV7: EditorStateMigratedV7 & PersistedState =
  cloneDeep(initialStateV6);

const initialStateV8: EditorStateMigratedV8 & PersistedState = {
  selectionSeq: 0,
  activeModComponentId: null,
  activeModId: null,
  expandedModId: null,
  error: null,
  modComponentFormStates: [],
  dirty: {},
  copiedBrick: undefined,
  brickPipelineUIStateById: {},
  dirtyModOptionsById: {},
  dirtyModMetadataById: {},
  visibleModal: null,
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

const initialStateV9: EditorStateMigratedV9 & PersistedState = {
  ...cloneDeep(initialStateV8),
  modComponentFormStates: [],
  deletedModComponentFormStatesByModId: {},
};

const initialStateV10: EditorStateMigratedV10 & PersistedState = {
  ...omit(cloneDeep(initialStateV9), "dirtyModOptionsById"),
  dirtyModOptionsDefinitionsById: {},
  dirtyModOptionsArgsById: {},
};

const initialStateV11: EditorStateMigratedV11 & PersistedState = {
  ...omit(
    cloneDeep(initialStateV10),
    "dirtyModOptionsDefinitionsById",
    "deletedModComponentFormStatesByModId",
  ),
  dirtyModOptionsDefinitionById: {},
  dirtyModVariablesDefinitionById: {},
  deletedModComponentFormStateIdsByModId: {},
};

const initialStateV12: EditorStateMigratedV12 & PersistedState = pick<
  EditorStateMigratedV11 & PersistedState,
  keyof EditorStateMigratedV11 | "_persist"
>(
  cloneDeep(initialStateV11),
  "dirty",
  "isDimensionsWarningDismissed",
  "dirtyModMetadataById",
  "dirtyModOptionsArgsById",
  "modComponentFormStates",
  "deletedModComponentFormStateIdsByModId",
  "dirtyModOptionsDefinitionById",
  "dirtyModVariablesDefinitionById",
  "_persist",
);

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
  state: EditorStateMigratedV2 & PersistedState,
): EditorStateMigratedV1 & PersistedState {
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
  state: EditorStateMigratedV3 & PersistedState,
): EditorStateMigratedV2 & PersistedState {
  return {
    ...omit(
      state,
      "activeModComponentId",
      "activeModId",
      "expandedModId",
      "modComponentFormStates",
      "brickPipelineUIStateById",
      "copiedBrick",
      "dirtyModOptionsById",
      "dirtyModMetadataById",
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
    elementUIStates: state.brickPipelineUIStateById,
    copiedBlock: state.copiedBrick,
    dirtyRecipeOptionsById: state.dirtyModOptionsById,
    dirtyRecipeMetadataById: state.dirtyModMetadataById,
    deletedElementsByRecipeId: state.deletedModComponentFormStatesByModId,
    availableInstalledIds: state.availableActivatedModComponentIds,
    isPendingInstalledExtensions:
      state.isPendingAvailableActivatedModComponents,
    availableDynamicIds: state.availableDraftModComponentIds,
    isPendingDynamicExtensions: state.isPendingDraftModComponents,
  };
}

function unmigrateEditorStateV4toV3(
  state: EditorStateMigratedV4 & PersistedState,
): EditorStateMigratedV3 & PersistedState {
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

function unmigrateFormStateV6toV5(formState: BaseFormStateV6): BaseFormStateV5 {
  return {
    ...formState,
    modMetadata: isInnerDefinitionRegistryId(formState.modMetadata.id)
      ? undefined
      : formState.modMetadata,
  };
}

function unmigrateFormStateV7toV6(
  formState: BaseFormStateV7,
  modState: Pick<DraftModState, "optionsArgs">,
): BaseFormStateV6 {
  return {
    ...formState,
    optionsArgs: modState.optionsArgs,
  };
}

function unmigrateFormStateV8toV7(
  formState: BaseFormStateV8,
  modState: Pick<DraftModState, "variablesDefinition">,
): BaseFormStateV7 {
  return {
    ...formState,
    variablesDefinition: modState.variablesDefinition,
  };
}

function unmigrateEditorStateV5toV4(
  state: EditorStateMigratedV5 & PersistedState,
): EditorStateMigratedV4 & PersistedState {
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
  state: EditorStateMigratedV6 & PersistedState,
): EditorStateMigratedV5 & PersistedState {
  return {
    ...state,
    insertingStarterBrickType: null,
  };
}

function unmigrateEditorStateV8toV7(
  state: EditorStateMigratedV8 & PersistedState,
): EditorStateMigratedV7 & PersistedState {
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

function unmigrateEditorStateV9toV8(
  state: EditorStateMigratedV9 & PersistedState,
): EditorStateMigratedV8 & PersistedState {
  return {
    ...state,
    modComponentFormStates: state.modComponentFormStates.map((formState) =>
      unmigrateFormStateV6toV5(formState),
    ),
  };
}

function unmigrateEditorStateV10toV9(
  state: EditorStateMigratedV10 & PersistedState,
): EditorStateMigratedV9 & PersistedState {
  const unmigrateFormState = (formState: BaseFormStateV7) =>
    unmigrateFormStateV7toV6(formState, {
      optionsArgs:
        state.dirtyModOptionsArgsById[formState.modMetadata.id] ?? {},
    });

  return omit(
    {
      ...state,
      dirtyModOptionsById: state.dirtyModOptionsDefinitionsById,
      modComponentFormStates: state.modComponentFormStates.map((formState) =>
        unmigrateFormState(formState),
      ),
      deletedModComponentFormStatesByModId: mapValues(
        state.deletedModComponentFormStatesByModId,
        (formStates) =>
          formStates.map((formState) => unmigrateFormState(formState)),
      ),
    },
    "dirtyModOptionsArgsById",
  );
}

function unmigrateEditorStateV11toV10(
  state: EditorStateMigratedV11 & PersistedState,
): EditorStateMigratedV10 & PersistedState {
  const unmigrateFormState = (formState: BaseFormStateV8) =>
    unmigrateFormStateV8toV7(formState, {
      variablesDefinition:
        state.dirtyModVariablesDefinitionById[formState.modMetadata.id] ??
        emptyModVariablesDefinitionFactory(),
    });

  return omit(
    {
      ...state,
      dirtyModOptionsDefinitionsById: state.dirtyModOptionsDefinitionById,
      modComponentFormStates: state.modComponentFormStates.map((formState) =>
        unmigrateFormState(formState),
      ),
      deletedModComponentFormStatesByModId: mapValues(
        state.deletedModComponentFormStateIdsByModId,
        (modComponentIds, modId) =>
          // Create fake form states for the deleted ones
          // XXX: ideally would assign mod metadata to the fake form states, but it doesn't matter for the tests
          modComponentIds.map((modComponentId) => ({
            ...formStateFactory({ formStateConfig: { uuid: modComponentId } }),
            variablesDefinition:
              state.dirtyModVariablesDefinitionById[
                validateRegistryId(modId)
              ] ?? emptyModVariablesDefinitionFactory(),
          })),
      ),
    },
    "dirtyModOptionsDefinitionById",
    "dirtyModVariablesDefinitionById",
  );
}

function unmigrateEditorStateV12toV11(
  state: EditorStateMigratedV12 & PersistedState,
): EditorStateMigratedV11 & PersistedState {
  return { ...initialStateV11, ...state };
}

type SimpleFactory<T> = (override?: FactoryConfig<T>) => T;

const formStateFactoryV8: SimpleFactory<BaseFormStateV8> = (override) =>
  formStateFactory({
    formStateConfig: override as FactoryConfig<InternalFormStateOverride>,
  });

const formStateFactoryV7: SimpleFactory<BaseFormStateV7> = (override) =>
  unmigrateFormStateV8toV7(formStateFactoryV8(), draftModStateFactory());

const formStateFactoryV6: SimpleFactory<BaseFormStateV6> = () =>
  unmigrateFormStateV7toV6(formStateFactoryV7(), draftModStateFactory());

const formStateFactoryV5: SimpleFactory<BaseFormStateV5> = () =>
  unmigrateFormStateV6toV5(formStateFactoryV6());

const formStateFactoryV4: SimpleFactory<BaseFormStateV4> = () =>
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
      const expectedEditorStateV3: EditorStateMigratedV3 & PersistedState = {
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
      const expectedEditorStateV4: EditorStateMigratedV4 & PersistedState = {
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
      const expectedEditorStateV5: EditorStateMigratedV5 & PersistedState = {
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
      const expectedEditorStateV6: EditorStateMigratedV6 & PersistedState =
        rest;
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

      initial.brickPipelineUIStateById[componentId].nodeUIStates[
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
      const expectedEditorStateV8: EditorStateMigratedV8 & PersistedState = {
        ...initialStateV8,
        modComponentFormStates: [formStateFactoryV5()],
      };
      const unmigrated = unmigrateEditorStateV8toV7(expectedEditorStateV8);
      expect(migrateEditorStateV7(unmigrated)).toStrictEqual(
        expectedEditorStateV8,
      );
    });
  });

  describe("migrateEditorState V8 to V9", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV8(initialStateV8)).toStrictEqual(
        initialStateV9,
      );
    });

    it("adds missing modMetadata", () => {
      const expectedEditorStateV9: EditorStateMigratedV9 & PersistedState = {
        ...initialStateV9,
        modComponentFormStates: [formStateFactoryV6()],
      };
      const unmigrated = unmigrateEditorStateV9toV8(expectedEditorStateV9);
      expect(migrateEditorStateV8(unmigrated)).toStrictEqual({
        ...expectedEditorStateV9,
        modComponentFormStates: [
          {
            ...expectedEditorStateV9.modComponentFormStates[0],
            modMetadata: expect.objectContaining({
              // Won't match exactly because the naming scheme is different between the factory and generation
              id: expect.stringMatching(/@internal\/mod\/\S+/),
              name: expect.toBeString(),
            }),
          },
        ],
      });
    });
  });

  describe("migrateEditorState V9 to V10", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV9(initialStateV9)).toStrictEqual(
        initialStateV10,
      );
    });

    it("migrates dirty options args", () => {
      const optionsArgs = { foo: 42 };
      const formState = formStateFactoryV7();

      const expectedEditorStateV10: EditorStateMigratedV10 & PersistedState = {
        ...initialStateV10,
        modComponentFormStates: [formState],
        dirty: { [formState.uuid]: true },
        dirtyModOptionsArgsById: {
          [formState.modMetadata.id]: optionsArgs,
        },
      };

      const unmigrated = unmigrateEditorStateV10toV9(expectedEditorStateV10);

      expect(migrateEditorStateV9(unmigrated)).toStrictEqual(
        expectedEditorStateV10,
      );
    });

    it("migrates clean options args", () => {
      const formState = formStateFactoryV7();

      const expectedEditorStateV10: EditorStateMigratedV10 & PersistedState = {
        ...initialStateV10,
        modComponentFormStates: [formState],
        dirty: {},
      };

      const unmigrated = unmigrateEditorStateV10toV9(expectedEditorStateV10);
      unmigrated.modComponentFormStates[0]!.optionsArgs = { foo: 42 };

      expect(migrateEditorStateV9(unmigrated)).toStrictEqual(
        expectedEditorStateV10,
      );
    });
  });

  describe("migrateEditorState V10 to V11", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV10(initialStateV10)).toStrictEqual(
        initialStateV11,
      );
    });

    it("migrates dirty mod variable definitions", () => {
      const variablesDefinition = {
        schema: propertiesToSchema({ foo: { type: "number" } }, []),
      };
      const formState = formStateFactoryV8();

      const expectedEditorStateV11: EditorStateMigratedV11 & PersistedState = {
        ...initialStateV11,
        modComponentFormStates: [formState],
        dirty: { [formState.uuid]: true },
        dirtyModVariablesDefinitionById: {
          [formState.modMetadata.id]: variablesDefinition,
        },
      };

      const unmigrated = unmigrateEditorStateV11toV10(expectedEditorStateV11);

      expect(migrateEditorStateV10(unmigrated)).toStrictEqual(
        expectedEditorStateV11,
      );
    });
  });

  describe("migrateEditorState V11 to V12", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV11(initialStateV11)).toStrictEqual(
        initialStateV12,
      );
    });

    it("EditorStateMigratedV12 state is preserved, all other keys are dropped", () => {
      const modId = validateRegistryId("test/mod");

      const modMetadata = modMetadataFactory({
        id: modId,
      });

      const variablesDefinition = {
        schema: propertiesToSchema({ foo: { type: "number" } }, []),
      };
      const formState = formStateFactoryV8({ modMetadata });

      const editorStateV12: EditorStateMigratedV12 & PersistedState = {
        ...initialStateV12,
        dirty: { [formState.uuid]: true },
        dirtyModVariablesDefinitionById: {
          [modId]: variablesDefinition,
        },
        isDimensionsWarningDismissed: true,
        dirtyModMetadataById: {
          [modId]: { ...modMetadata, name: "New Name" },
        },
        dirtyModOptionsDefinitionById: {
          [modId]: {
            ...emptyModOptionsDefinitionFactory(),
            ...propertiesToSchema(
              {
                db: {
                  $ref: "https://app.pixiebrix.com/schemas/database#",
                  title: "Database",
                  format: "preview",
                },
              },
              ["db"],
            ),
          },
        },
        dirtyModOptionsArgsById: {
          [modId]: { db: "db value" },
        },
        modComponentFormStates: [formState],
        deletedModComponentFormStateIdsByModId: {
          [modId]: [formStateFactoryV8().uuid],
        },
      };

      const unmigrated = unmigrateEditorStateV12toV11(editorStateV12);

      expect(migrateEditorStateV11(unmigrated)).toStrictEqual(editorStateV12);
    });
  });
});
