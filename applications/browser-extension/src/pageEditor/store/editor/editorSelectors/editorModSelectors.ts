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

import type { EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";
import type { RegistryId } from "@/types/registryTypes";
import { createSelector } from "@reduxjs/toolkit";
import { isEmpty, memoize, sortBy, uniqBy } from "lodash";
import { selectModInstances } from "@/store/modComponents/modInstanceSelectors";
import mapModDefinitionToModMetadata from "@/modDefinitions/util/mapModDefinitionToModMetadata";
import { normalizeModOptionsDefinition } from "@/utils/modUtils";
import {
  selectGetModComponentFormStateByModComponentId,
  selectIsModComponentDirtyById,
  selectModComponentFormStates,
  selectNotDeletedActivatedModComponents,
} from "@/pageEditor/store/editor/editorSelectors/editorModComponentSelectors";
import type { ModMetadata } from "@/types/modComponentTypes";
import type { UUID } from "@/types/stringTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { isModComponentBase } from "@/pageEditor/utils";
import {
  collectModOptionsArgs,
  collectModVariablesDefinition,
} from "@/store/modComponents/modComponentUtils";

///
/// MOD METADATA
///

const selectDirtyModMetadataById = ({ editor }: EditorRootState) =>
  editor.dirtyModMetadataById;

const dirtyMetadataForModIdSelector = createSelector(
  selectDirtyModMetadataById,
  (_state: EditorRootState, modId: RegistryId) => modId,
  (dirtyModMetadataById, modId) =>
    // eslint-disable-next-line security/detect-object-injection -- modId is a controlled string
    dirtyModMetadataById[modId],
);

export const selectDirtyMetadataForModId =
  (modId: RegistryId) => (state: EditorRootState) =>
    dirtyMetadataForModIdSelector(state, modId);

export const selectModMetadatas = createSelector(
  selectModComponentFormStates,
  selectModInstances,
  selectDirtyModMetadataById,
  (formStates, modInstances, dirtyModMetadataById) => {
    const formStateModMetadatas = formStates.map(
      (formState) => formState.modMetadata,
    );

    const activatedModMetadatas = modInstances.map((x) =>
      mapModDefinitionToModMetadata(x.definition),
    );

    const baseMetadatas = uniqBy(
      // Order shouldn't matter because dirty metadata is not stored on the form states
      [...formStateModMetadatas, ...activatedModMetadatas],
      (x) => x.id,
    );

    return baseMetadatas.map(
      (metadata) =>
        ({
          ...metadata,
          // Can't return the dirty values directly because it's missing some props that ModMetadata requires
          ...dirtyModMetadataById[metadata.id],
        }) satisfies ModMetadata,
    );
  },
);

export const selectModMetadataMap = createSelector(
  selectModMetadatas,
  (metadatas) => new Map(metadatas.map((metadata) => [metadata.id, metadata])),
);

///
/// MOD OPTION DEFINITIONS
///

const selectDirtyModOptionsDefinitionById = ({ editor }: EditorRootState) =>
  editor.dirtyModOptionsDefinitionById;

const selectGetDirtyModOptionsDefinitionForModId = createSelector(
  selectDirtyModOptionsDefinitionById,
  (dirtyOptionsDefinitionsByModId) =>
    // Memoize because normalizeModOptionsDefinition returns a fresh object reference
    memoize((modId: RegistryId) => {
      // eslint-disable-next-line security/detect-object-injection -- RegistryId for mod
      const options = dirtyOptionsDefinitionsByModId[modId];

      if (options) {
        // Provide a consistent shape of the options
        return normalizeModOptionsDefinition(options);
      }

      // Return undefined if the options aren't dirty. Returning nullish instead of a default empty options allows the
      // caller to distinguish no dirty options vs. options that have been reverted to the default.
    }),
);

export const selectDirtyModOptionsDefinitionForModId =
  (modId: RegistryId) => (state: EditorRootState) =>
    selectGetDirtyModOptionsDefinitionForModId(state)(modId);

///
/// MOD COMPONENTS
///

export const selectGetModComponentFormStatesForMod = createSelector(
  selectModComponentFormStates,
  (formStates) =>
    // Memoize because `filter` returns a fresh object reference
    memoize((modId: RegistryId) =>
      formStates.filter((formState) => formState.modMetadata.id === modId),
    ),
);

/**
 * Returns a getter for activated mod components that haven't been converted to form states yet
 * @see useEnsureFormStates
 */
export const selectGetUntouchedActivatedModComponentsForMod = createSelector(
  selectNotDeletedActivatedModComponents,
  selectGetModComponentFormStatesForMod,
  (activatedModComponents, getModComponentFormStateByModId) =>
    // Memoize because filter constructs a fresh object reference
    memoize((modId: RegistryId) => {
      const formStateIds = new Set(
        getModComponentFormStateByModId(modId).map((x) => x.uuid),
      );

      return activatedModComponents.filter(
        (x) => x.modMetadata.id === modId && !formStateIds.has(x.id),
      );
    }),
);

export const selectGetCleanComponentsAndDirtyFormStatesForMod = createSelector(
  selectNotDeletedActivatedModComponents,
  selectGetModComponentFormStatesForMod,
  selectIsModComponentDirtyById,
  (
    activatedModComponents,
    getModComponentFormStateByModId,
    isDirtyByComponentId,
  ) =>
    // Memoize because method constructs a fresh object reference
    memoize((modId: RegistryId) => {
      const dirtyModComponentFormStates = getModComponentFormStateByModId(
        modId,
      ).filter((formState) => isDirtyByComponentId[formState.uuid]);

      const cleanModComponents = activatedModComponents.filter(
        (modComponent) =>
          modComponent.modMetadata.id === modId &&
          !dirtyModComponentFormStates.some(
            (formState) => formState.uuid === modComponent.id,
          ),
      );

      return {
        cleanModComponents,
        dirtyModComponentFormStates,
      };
    }),
);

/**
 * @see selectGetSiblingDraftModComponents
 */
export const selectGetDraftModComponentsForMod = createSelector(
  selectGetCleanComponentsAndDirtyFormStatesForMod,
  (getCleanComponentsAndDirtyFormStatesForMod) =>
    // Memoize because method constructs a fresh object reference
    memoize((modId: RegistryId) => {
      const { cleanModComponents, dirtyModComponentFormStates } =
        getCleanComponentsAndDirtyFormStatesForMod(modId);

      // Return a consistent order so mod component order is stable on save
      return sortBy(
        [...cleanModComponents, ...dirtyModComponentFormStates],
        (x) => x.label,
      );
    }),
);

/**
 * Returns getter for sibling mod components for a given form state. Includes the query form state.
 * @see selectGetDraftModComponentsForMod
 */
export const selectGetSiblingDraftModComponents = createSelector(
  selectGetModComponentFormStateByModComponentId,
  selectGetDraftModComponentsForMod,
  (getModComponentFormStateByModComponentId, getDraftModComponentsForMod) =>
    memoize((modComponentId: UUID) => {
      const modComponentFormState =
        getModComponentFormStateByModComponentId(modComponentId);

      assertNotNullish(
        modComponentFormState,
        "Expected matching modComponentFormState",
      );
      return getDraftModComponentsForMod(modComponentFormState.modMetadata.id);
    }),
);

///
/// MOD OPTIONS ARGS
///

const selectDirtyOptionsArgsByModId = (state: EditorRootState) =>
  state.editor.dirtyModOptionsArgsById;

/**
 * Returns the draft mod options args for the given mod id.
 */
export const selectGetOptionsArgsForModId = createSelector(
  selectDirtyOptionsArgsByModId,
  selectGetDraftModComponentsForMod,
  (dirtyOptionsArgsForModId, getDraftModComponentsForMod) =>
    memoize(
      (modId: RegistryId) =>
        // eslint-disable-next-line security/detect-object-injection -- registry id
        dirtyOptionsArgsForModId[modId] ??
        collectModOptionsArgs(
          getDraftModComponentsForMod(modId).filter((x) =>
            isModComponentBase(x),
          ),
        ),
    ),
);

///
/// MOD VARIABLE DEFINITIONS
///

const selectDirtyModVariablesDefinitionByModId = (state: EditorRootState) =>
  state.editor.dirtyModVariablesDefinitionById;

/**
 * Returns the draft mod options args for the given mod id.
 */
export const selectGetModVariablesDefinitionForModId = createSelector(
  selectDirtyModVariablesDefinitionByModId,
  selectGetDraftModComponentsForMod,
  (dirtyModVariablesDefinitionForModId, getDraftModComponentsForMod) =>
    memoize(
      (modId: RegistryId) =>
        // eslint-disable-next-line security/detect-object-injection -- registry id
        dirtyModVariablesDefinitionForModId[modId] ??
        collectModVariablesDefinition(
          getDraftModComponentsForMod(modId).filter((x) =>
            isModComponentBase(x),
          ),
        ),
    ),
);

///
/// MOD DIRTY STATE
///

/** @internal */
export const selectDeletedComponentFormStateIdsByModId = ({
  editor,
}: EditorRootState) => editor.deletedModComponentFormStateIdsByModId;

/**
 * Returns a function that returns if the mod definition or instance (i.e., options args, integration configurations)
 * are dirty.
 */
const selectGetModIsDirtySelector = createSelector(
  selectDirtyModMetadataById,
  selectIsModComponentDirtyById,
  selectGetDirtyModOptionsDefinitionForModId,
  selectDirtyModVariablesDefinitionByModId,
  selectDirtyOptionsArgsByModId,
  selectGetModComponentFormStatesForMod,
  selectDeletedComponentFormStateIdsByModId,
  (
    dirtyModMetadata,
    isModComponentDirtyById,
    getDirtyOptionsDefinitionsForModId,
    dirtyModVariablesDefinitionForModId,
    dirtyModOptionsArgsForModId,
    getModComponentFormStatesByModId,
    getDeletedModComponentFormStateIdsByModId,
    // eslint-disable-next-line max-params -- required because createSelector takes array of selector args
  ) =>
    // Memoize for consistency. It's not necessary because the return value is primitive
    memoize((modId: RegistryId) => {
      const hasDirtyFormState = getModComponentFormStatesByModId(modId).some(
        // eslint-disable-next-line security/detect-object-injection -- UUID
        ({ uuid }) => isModComponentDirtyById[uuid],
      );

      return (
        // eslint-disable-next-line security/detect-object-injection -- registry id
        Boolean(dirtyModMetadata[modId]) ||
        Boolean(getDirtyOptionsDefinitionsForModId(modId)) ||
        // eslint-disable-next-line security/detect-object-injection -- registry id
        Boolean(dirtyModVariablesDefinitionForModId[modId]) ||
        // Mod Options Args aren't on the mod definition. But this selector is used to determine if the mod definition
        // or its configuration is dirty.
        // eslint-disable-next-line security/detect-object-injection -- registry id
        Boolean(dirtyModOptionsArgsForModId[modId]) ||
        hasDirtyFormState ||
        // eslint-disable-next-line security/detect-object-injection -- registry id
        !isEmpty(getDeletedModComponentFormStateIdsByModId[modId])
      );
    }),
);

export const selectModIsDirty =
  (modId: RegistryId) => (state: EditorRootState) =>
    modId != null && selectGetModIsDirtySelector(state)(modId);

///
/// MOD DRAFT STATE
///

/**
 * Returns a selector for getting the mod-level state of a draft mod.
 *
 * The mod options definition is only included if it's dirty because there's no way derive the current
 * ModOptionsDefinition from the Redux store because it's not stored on the activated modComponentsSlice, and only the
 * dirty values are stored on the editorSlice.
 */
export const selectGetModDraftStateForModId = createSelector(
  selectModMetadataMap,
  selectGetDirtyModOptionsDefinitionForModId,
  selectGetOptionsArgsForModId,
  selectGetModVariablesDefinitionForModId,
  (
    modMetadataMap,
    getDirtyModOptionsDefinitionForModId,
    getOptionsArgsForModId,
    getModVariablesDefinitionForModId,
  ) =>
    // Memoize because it constructs a new object
    memoize((modId: RegistryId) => {
      const modMetadata = modMetadataMap.get(modId);
      assertNotNullish(modMetadata, "Expected mod metadata");
      return {
        modMetadata,
        // See jsdoc comment on why the options definition is only available if it's dirty
        dirtyModOptionsDefinition: getDirtyModOptionsDefinitionForModId(modId),
        optionsArgs: getOptionsArgsForModId(modId),
        variablesDefinition: getModVariablesDefinitionForModId(modId),
      };
    }),
);
