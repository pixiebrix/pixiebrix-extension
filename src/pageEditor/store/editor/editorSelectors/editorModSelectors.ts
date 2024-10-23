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
import type { ModComponentBase, ModMetadata } from "@/types/modComponentTypes";
import mapModDefinitionToModMetadata from "@/modDefinitions/util/mapModDefinitionToModMetadata";
import { normalizeModOptionsDefinition } from "@/utils/modUtils";
import {
  selectActiveModComponentFormState,
  selectIsModComponentDirtyById,
  selectModComponentFormStates,
  selectNotDeletedActivatedModComponents,
  selectNotDeletedModComponentFormStates,
} from "@/pageEditor/store/editor/editorSelectors/editorModComponentSelectors";
import { selectActiveModId } from "@/pageEditor/store/editor/editorSelectors/editorNavigationSelectors";

/**
 * Select the mod id associated with the selected mod package or mod component. Should be used if the caller doesn't
 * need to know if the mod item or one of its components is selected.
 * @see selectActiveModId
 * @see selectExpandedModId
 */
export const selectCurrentModId = createSelector(
  selectActiveModId,
  selectActiveModComponentFormState,
  (activeModId, activeModComponentFormState) =>
    activeModId ?? activeModComponentFormState?.modMetadata.id,
);

///
/// MOD METADATA
///

export const selectDirtyModMetadata = ({ editor }: EditorRootState) =>
  editor.dirtyModMetadataById;

export const dirtyMetadataForModIdSelector = createSelector(
  selectDirtyModMetadata,
  (_state: EditorRootState, modId: RegistryId) => modId,
  (dirtyModMetadataById, modId) =>
    // eslint-disable-next-line security/detect-object-injection -- modId is a controlled string
    dirtyModMetadataById[modId],
);

export const selectActivatedModMetadatas = createSelector(
  selectModComponentFormStates,
  selectModInstances,
  selectDirtyModMetadata,
  (formStates, modInstances, dirtyModMetadataById) => {
    const formStateModMetadatas: Array<ModComponentBase["modMetadata"]> =
      formStates.map((formState) => formState.modMetadata);

    const activatedModMetadatas: Array<ModComponentBase["modMetadata"]> =
      modInstances.map((x) => mapModDefinitionToModMetadata(x.definition));

    const baseMetadatas = uniqBy(
      [...formStateModMetadatas, ...activatedModMetadatas],
      (x) => x.id,
    );

    return baseMetadatas.map((metadata) => {
      const dirtyMetadata = dirtyModMetadataById[metadata.id];
      if (dirtyMetadata) {
        return {
          ...metadata,
          ...dirtyMetadata,
        } as ModMetadata;
      }

      return metadata;
    });
  },
);

export const selectModMetadataMap = createSelector(
  selectActivatedModMetadatas,
  (metadatas) => {
    const metadataMap = new Map<RegistryId, ModMetadata>();
    for (const metadata of metadatas) {
      metadataMap.set(metadata.id, metadata);
    }

    return metadataMap;
  },
);

export const selectDirtyMetadataForModId =
  (modId: RegistryId | undefined) => (state: EditorRootState) =>
    modId ? dirtyMetadataForModIdSelector(state, modId) : null;

///
/// MOD OPTION DEFINITIONS
///

export const selectDirtyModOptionsDefinitions = ({ editor }: EditorRootState) =>
  editor.dirtyModOptionsById;

const dirtyOptionsDefinitionsForModIdSelector = createSelector(
  selectDirtyModOptionsDefinitions,
  (_state: EditorRootState, modId: RegistryId | null) => modId,
  (dirtyOptionsDefinitionsByModId, modId) => {
    if (modId == null) {
      return;
    }

    // eslint-disable-next-line security/detect-object-injection -- RegistryId for mod
    const options = dirtyOptionsDefinitionsByModId[modId];

    if (options) {
      // Provide a consistent shape of the options
      return normalizeModOptionsDefinition(options);
    }

    // Return undefined if the options aren't dirty. Returning nullish instead of a default empty options allows the
    // caller to distinguish no dirty options vs. options that have been reverted to the default.
  },
);

export const selectDirtyOptionsDefinitionsForModId =
  (modId: RegistryId | null) => (state: EditorRootState) =>
    dirtyOptionsDefinitionsForModIdSelector(state, modId);

///
/// OPTIONS ARGS
///

const dirtyOptionArgsForModIdSelector = createSelector(
  selectNotDeletedModComponentFormStates,
  (_state: EditorRootState, modId: RegistryId | null) => modId,
  (formStates, modId) =>
    formStates.find((formState) => formState.modMetadata.id === modId)
      ?.optionsArgs,
);

export const selectDirtyOptionArgsForModId =
  (modId: RegistryId | null) => (state: EditorRootState) =>
    dirtyOptionArgsForModIdSelector(state, modId);

///
/// MOD DIRTY STATE
///

/** @internal */
export const selectDeletedComponentFormStatesByModId = ({
  editor,
}: EditorRootState) => editor.deletedModComponentFormStatesByModId;

const modIsDirtySelector = createSelector(
  selectIsModComponentDirtyById,
  dirtyOptionsDefinitionsForModIdSelector,
  dirtyMetadataForModIdSelector,
  (state: EditorRootState, modId: RegistryId) =>
    // eslint-disable-next-line security/detect-object-injection -- RegistryId is a controlled string
    selectDeletedComponentFormStatesByModId(state)[modId],
  ({ editor }: EditorRootState, modId: RegistryId) =>
    editor.modComponentFormStates
      .filter((formState) => formState.modMetadata.id === modId)
      .map((formState) => formState.uuid),
  (
    isModComponentDirtyById,
    dirtyModOptions,
    dirtyModMetadata,
    deletedModComponentFormStates,
    modComponentFormStateIds,
    // eslint-disable-next-line max-params -- all are needed
  ) => {
    const hasDirtyComponentFormStates = modComponentFormStateIds.some(
      // eslint-disable-next-line security/detect-object-injection -- UUID
      (modComponentId) => isModComponentDirtyById[modComponentId],
    );
    return (
      hasDirtyComponentFormStates ||
      Boolean(dirtyModOptions) ||
      Boolean(dirtyModMetadata) ||
      !isEmpty(deletedModComponentFormStates)
    );
  },
);

export const selectModIsDirty =
  (modId?: RegistryId) => (state: EditorRootState) =>
    Boolean(modId && modIsDirtySelector(state, modId));

///
/// MOD COMPONENTS
///

export const selectGetModComponentFormStatesByModId = createSelector(
  selectModComponentFormStates,
  (formStates) =>
    memoize((modId: RegistryId) =>
      formStates.filter((formState) => formState.modMetadata.id === modId),
    ),
);

export const selectFirstModComponentFormStateForActiveMod = createSelector(
  selectModComponentFormStates,
  selectActiveModId,
  (formState, activeModId) =>
    formState.find((x) => x.modMetadata.id === activeModId),
);

export const selectGetCleanComponentsAndDirtyFormStatesForMod = createSelector(
  selectNotDeletedActivatedModComponents,
  selectNotDeletedModComponentFormStates,
  selectIsModComponentDirtyById,
  (activatedModComponents, formStates, isDirtyByComponentId) =>
    // Memoize because method constructs a fresh object reference
    memoize((modId: RegistryId) => {
      const dirtyModComponentFormStates = formStates.filter(
        (formState) =>
          formState.modMetadata.id === modId &&
          isDirtyByComponentId[formState.uuid],
      );

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
