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

import { createSelector } from "@reduxjs/toolkit";
import type {
  EditorRootState,
  EditorState,
  RootState,
} from "@/pageEditor/store/editor/pageEditorTypes";
import type { ModComponentsRootState } from "@/store/modComponents/modComponentTypes";
import type { ActivatedModComponent } from "@/types/modComponentTypes";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import { assertNotNullish } from "@/utils/nullishUtils";
import type { UUID } from "@/types/stringTypes";
import { memoize } from "lodash";

/**
 * @file Selectors for working with individual mod components and form states.
 */

/**
 * Select the draft mod component form states. Only includes component form states that have not been deleted.
 */
export const selectModComponentFormStates = ({
  editor,
}: EditorRootState): EditorState["modComponentFormStates"] =>
  editor.modComponentFormStates;

export const selectGetModComponentFormStateByModComponentId = createSelector(
  selectModComponentFormStates,
  (modComponentFormStates) =>
    memoize((modComponentId: UUID) =>
      modComponentFormStates.find((x) => x.uuid === modComponentId),
    ),
);

/**
 * Select the active/selected mod component, or null if a mod component is not currently selected
 */
export const selectActiveModComponentFormState = createSelector(
  // Write directly instead of selectActiveModComponentId to avoid circular dependency with editorNavigationSelectors
  ({ editor }: EditorRootState) => editor.activeModComponentId,
  selectModComponentFormStates,
  (activeModComponentId, formStates) =>
    formStates.find((x) => x.uuid === activeModComponentId),
);

/**
 * Select a runtime ModComponentRef for the mod component being edited
 * @see ModComponentRef
 */
export const selectActiveModComponentRef = createSelector(
  selectActiveModComponentFormState,
  (formState) => {
    assertNotNullish(formState, "Expected active mod component form state");

    return {
      modComponentId: formState.uuid,
      modId: formState.modMetadata.id,
      // XXX: the Page Editor form state uses an artificial id. When it's added to the page, the artificial id will be
      // replaced with the hash id calculated during hydration
      starterBrickId: formState.starterBrick.metadata.id,
    };
  },
);

///
/// DELETE STATE
///

export const selectAllDeletedModComponentIds = createSelector(
  ({ editor }: EditorRootState) =>
    editor.deletedModComponentFormStateIdsByModId,
  (deletedModComponentFormStateIdsByModId) =>
    new Set(Object.values(deletedModComponentFormStateIdsByModId).flat()),
);

export const selectNotDeletedActivatedModComponents: ({
  options,
}: ModComponentsRootState) => ActivatedModComponent[] = createSelector(
  selectActivatedModComponents,
  selectAllDeletedModComponentIds,
  (activatedModComponents, deletedModComponentIds) =>
    activatedModComponents.filter(({ id }) => !deletedModComponentIds.has(id)),
);

//
// DIRTY STATE
//

export const selectIsModComponentDirtyById = ({ editor }: EditorRootState) =>
  editor.dirty;

const modComponentIsDirtySelector = createSelector(
  selectIsModComponentDirtyById,
  (_state: RootState, modComponentId: UUID) => modComponentId,
  (isModComponentDirtyById, modComponentId) =>
    // eslint-disable-next-line security/detect-object-injection -- UUID
    isModComponentDirtyById[modComponentId] ?? false,
);

export const selectModComponentIsDirty =
  (modComponentId: UUID) => (state: RootState) =>
    modComponentIsDirtySelector(state, modComponentId);
