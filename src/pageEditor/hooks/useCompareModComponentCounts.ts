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

import { type UnsavedModDefinition } from "@/types/modDefinitionTypes";
import { useSelector } from "react-redux";
import {
  selectDeletedElements,
  selectDirty,
  selectElements,
} from "@/pageEditor/slices/editorSelectors";
import { useCallback } from "react";
import { selectExtensions } from "@/store/extensionsSelectors";

/**
 * @returns {function} - A function that compares the number of mod components in the redux state and the mod definition
 */
function useCompareModComponentCounts() {
  const modComponentFormStates = useSelector(selectElements);
  const deletedModComponentsById = useSelector(selectDeletedElements);
  const isDirtyByModComponentId = useSelector(selectDirty);
  const activatedModComponents = useSelector(selectExtensions);

  return useCallback(
    (modDefinition: UnsavedModDefinition) => {
      const modId = modDefinition.metadata.id;
      // eslint-disable-next-line security/detect-object-injection -- RegistryId
      const deletedModComponentFormStates =
        deletedModComponentsById[modId] ?? [];
      const deletedModComponentIds = new Set(
        deletedModComponentFormStates.map(({ uuid }) => uuid),
      );

      // TODO: Extract to selectors and test clean/dirty separation behavior
      // And reuse the same selectors in useSaveMod
      const dirtyModComponentFormStates = modComponentFormStates.filter(
        (modComponentFormState) =>
          modComponentFormState.recipe?.id === modId &&
          isDirtyByModComponentId[modComponentFormState.uuid] &&
          !deletedModComponentIds.has(modComponentFormState.uuid),
      );

      const cleanModComponentsExcludingDirtyFormStates =
        activatedModComponents.filter(
          (modComponent) =>
            modComponent._recipe?.id === modId &&
            !dirtyModComponentFormStates.some(
              (modComponentFormState) =>
                modComponentFormState.uuid === modComponent.id,
            ) &&
            !deletedModComponentIds.has(modComponent.id),
        );

      const totalNumberModComponentsFromState =
        dirtyModComponentFormStates.length +
        cleanModComponentsExcludingDirtyFormStates.length;
      const totalNumberModComponentsFromDefinition =
        modDefinition.extensionPoints.length;

      return (
        totalNumberModComponentsFromState ===
        totalNumberModComponentsFromDefinition
      );
    },
    [
      activatedModComponents,
      deletedModComponentsById,
      isDirtyByModComponentId,
      modComponentFormStates,
    ],
  );
}

export default useCompareModComponentCounts;
