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
import type { RegistryId } from "@/types/registryTypes";
import {
  selectIsModComponentDirtyById,
  selectNotDeletedModComponentFormStates,
  selectNotDeletedActivatedModComponents,
} from "@/pageEditor/store/editor/editorSelectors";
import { memoize } from "lodash";

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

export const selectGetDraftModComponentIds = createSelector(
  selectGetCleanComponentsAndDirtyFormStatesForMod,
  (getCleanComponentsAndDirtyFormStatesForMod) =>
    // Memoize because method constructs a fresh object reference
    memoize((modId: RegistryId) => {
      const { cleanModComponents, dirtyModComponentFormStates } =
        getCleanComponentsAndDirtyFormStatesForMod(modId);
      return [
        ...cleanModComponents.map((modComponent) => modComponent.id),
        ...dirtyModComponentFormStates.map((formState) => formState.uuid),
      ];
    }),
);
