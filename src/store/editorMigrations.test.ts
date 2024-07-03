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
  type EditorStateV3,
  type EditorStateV1,
  type EditorStateV2,
  type EditorStateV4,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { mapValues, omit } from "lodash";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import {
  type IntegrationDependencyV1,
  type IntegrationDependencyV2,
} from "@/integrations/integrationTypes";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { validateRegistryId } from "@/types/helpers";
import {
  type BaseFormStateV3,
  type BaseFormStateV1,
  type BaseFormStateV2,
  type BaseModComponentStateV2,
  type BaseModComponentStateV1,
} from "@/pageEditor/store/editor/baseFormStateTypes";
import { type PersistedState } from "redux-persist";
import {
  migrateEditorStateV1,
  migrateEditorStateV2,
  migrateEditorStateV3,
} from "@/store/editorMigrations";

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

describe("editor state migrations", () => {
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

  function unmigrateFormState(formState: BaseFormStateV2): BaseFormStateV1 {
    return {
      ...omit(formState, "integrationDependencies"),
      services: unmigrateServices(formState.integrationDependencies),
    };
  }

  function unmigrateDeletedElements(
    deletedElements: Record<string, BaseFormStateV2[]>,
  ): Record<string, BaseFormStateV1[]> {
    return mapValues(deletedElements, (formStates) =>
      formStates.map((formState) => unmigrateFormState(formState)),
    );
  }

  function unmigrateEditorStateV2(
    state: EditorStateV2 & PersistedState,
  ): EditorStateV1 & PersistedState {
    return {
      ...omit(state, "elements", "deletedElementsByRecipeId"),
      elements: state.elements.map((element) => unmigrateFormState(element)),
      deletedElementsByRecipeId: unmigrateDeletedElements(
        state.deletedElementsByRecipeId,
      ),
    };
  }

  function unmigrateModComponentStateV1(
    state: BaseModComponentStateV2,
  ): BaseModComponentStateV1 {
    return {
      blockPipeline: state.brickPipeline,
    };
  }

  function unmigrateFormStateV2(formState: BaseFormStateV3): BaseFormStateV2 {
    return {
      ...omit(formState, ["modMetadata", "modComponent", "starterBrick"]),
      recipe: formState.modMetadata,
      extension: unmigrateModComponentStateV1(formState.modComponent),
      extensionPoint: formState.starterBrick,
    };
  }

  function unmigrateEditorStateV3(
    state: EditorStateV4 & PersistedState,
  ): EditorStateV3 & PersistedState {
    return {
      ...omit(
        state,
        "modComponentFormStates",
        "deletedModComponentFormStatesByModId",
      ),
      modComponentFormStates: state.modComponentFormStates.map((formState) =>
        unmigrateFormStateV2(formState),
      ),
      deletedModComponentFormStatesByModId: mapValues(
        state.deletedModComponentFormStatesByModId,
        (formStates) =>
          formStates.map((formState) => unmigrateFormStateV2(formState)),
      ),
    };
  }

  describe("migrateEditorStateV1", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV1(initialStateV1)).toStrictEqual(
        initialStateV2,
      );
    });

    it("migrates state with elements with no services", () => {
      const expectedState = {
        ...initialStateV2,
        elements: [
          unmigrateFormStateV2(formStateFactory()),
          unmigrateFormStateV2(formStateFactory()),
        ],
      };
      const unmigrated = unmigrateEditorStateV2(expectedState);
      expect(migrateEditorStateV1(unmigrated)).toStrictEqual(expectedState);
    });

    it("migrates state with elements with services and deleted elements", () => {
      const fooElement1 = unmigrateFormStateV2(
        formStateFactory({
          modMetadata: modMetadataFactory({
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
        }),
      );
      const fooElement2 = unmigrateFormStateV2(
        formStateFactory({
          modMetadata: modMetadataFactory({
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
        }),
      );
      const barElement = unmigrateFormStateV2(
        formStateFactory({
          modMetadata: modMetadataFactory({
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
        }),
      );
      const expectedState = {
        ...initialStateV2,
        elements: [
          unmigrateFormStateV2(
            formStateFactory({
              integrationDependencies: [
                integrationDependencyFactory({
                  configId: uuidSequence,
                }),
              ],
            }),
          ),
          fooElement1,
          fooElement2,
          barElement,
        ],
        deletedElementsByRecipeId: {
          foo: [fooElement1, fooElement2],
          bar: [barElement],
        },
      };
      const unmigrated = unmigrateEditorStateV2(expectedState);
      expect(migrateEditorStateV1(unmigrated)).toStrictEqual(expectedState);
    });
  });

  describe("migrateEditorStateV2", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV2(initialStateV2)).toStrictEqual(
        initialStateV3,
      );
    });
  });

  describe("migrateEditorStateV3", () => {
    it("migrates empty state", () => {
      expect(migrateEditorStateV3(initialStateV3)).toStrictEqual(
        initialStateV4,
      );
    });

    it("migrates the form states", () => {
      const formState = formStateFactory();
      const expectedState = {
        ...initialStateV4,
        modComponentFormStates: [formState],
      };
      const unmigrated = unmigrateEditorStateV3(expectedState);
      expect(migrateEditorStateV3(unmigrated)).toStrictEqual(expectedState);
    });
  });
});
