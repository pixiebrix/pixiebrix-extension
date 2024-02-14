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
  ModDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import { useCallback } from "react";
import { useSelector } from "react-redux";
import {
  selectDeletedElements,
  selectDirty,
  selectElements,
} from "@/pageEditor/slices/editorSelectors";
import { selectExtensions } from "@/store/extensionsSelectors";

function useEnsureModComponentStarterBricks(): (
  modDefinition: ModDefinition,
) => Promise<boolean> {
  const modComponentFormStates = useSelector(selectElements);
  const deletedModComponentsById = useSelector(selectDeletedElements);
  const isDirtyByModComponentId = useSelector(selectDirty);
  const activatedModComponents = useSelector(selectExtensions);

  return useCallback(
    async (modDefinition: UnsavedModDefinition) => {
      const modId = modDefinition.metadata.id;
      const deletedModComponentFormStates =
        // eslint-disable-next-line security/detect-object-injection -- RegistryId
        deletedModComponentsById[modId] ?? [];
      const deletedModComponentIds = new Set(
        deletedModComponentFormStates.map(({ uuid }) => uuid),
      );

      const extensionPointIdsFromState: string[] = [];

      // TODO: Extract to selectors and test clean/dirty separation behavior
      // And reuse the same selectors in useSaveMod
      const dirtyModComponentFormStates = modComponentFormStates.filter(
        (modComponentFormState) =>
          modComponentFormState.recipe?.id === modId &&
          isDirtyByModComponentId[modComponentFormState.uuid] &&
          !deletedModComponentIds.has(modComponentFormState.uuid),
      );

      // Ensure each starter brick for dirty components is present in the mod definition extension points
      for (const formState of dirtyModComponentFormStates) {
        extensionPointIdsFromState.push(formState.extensionPoint.metadata.id);
        if (
          !modDefinition.extensionPoints.some(
            (extensionPoint) =>
              extensionPoint.id === formState.extensionPoint.metadata.id,
          )
        ) {
          return false;
        }
      }

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

      // Ensure each starter brick for clean components is present in the mod definition extension points
      for (const modComponent of cleanModComponentsExcludingDirtyFormStates) {
        extensionPointIdsFromState.push(modComponent.extensionPointId);
        if (
          !modDefinition.extensionPoints.some(
            (extensionPoint) =>
              extensionPoint.id === modComponent.extensionPointId,
          )
        ) {
          return false;
        }
      }

      return true;
    },
    [
      activatedModComponents,
      deletedModComponentsById,
      isDirtyByModComponentId,
      modComponentFormStates,
    ],
  );
}

export default useEnsureModComponentStarterBricks;
