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

import { type ModComponentsRootState } from "@/store/modComponents/modComponentTypes";
import { createSelector } from "@reduxjs/toolkit";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import { isEmpty, memoize } from "lodash";
import { type UUID } from "@/types/stringTypes";

export function selectActivatedModComponents({
  options,
}: ModComponentsRootState): ActivatedModComponent[] {
  if (!Array.isArray(options.activatedModComponents)) {
    console.warn("state migration has not been applied yet", {
      options,
    });
    throw new TypeError("state migration has not been applied yet");
  }

  return options.activatedModComponents;
}

const isModComponentSavedOnCloudSelector = createSelector(
  selectActivatedModComponents,
  (_state: ModComponentsRootState, modComponentId: UUID) => modComponentId,
  (modComponents, modComponentId) =>
    modComponents.some((modComponent) => modComponent.id === modComponentId),
);

export const selectIsModComponentSavedOnCloud =
  (modComponentId: UUID) => (state: ModComponentsRootState) =>
    isModComponentSavedOnCloudSelector(state, modComponentId);

export const selectGetModComponentsForMod = createSelector(
  selectActivatedModComponents,
  (activatedModComponents) =>
    // When activatedModComponents changes, the createSelector call will return a new function with the memoized
    // method referencing the new activatedModComponents
    memoize((modId: RegistryId) =>
      activatedModComponents.filter(
        (activatedModComponent) => activatedModComponent._recipe?.id === modId,
      ),
    ),
);

export const selectModHasAnyActivatedModComponents =
  (modId?: RegistryId) =>
  (state: ModComponentsRootState): boolean =>
    Boolean(modId && !isEmpty(selectGetModComponentsForMod(state)(modId)));
