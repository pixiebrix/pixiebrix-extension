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
  type ModDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import { useCallback } from "react";
import { useSelector } from "react-redux";
import {
  selectDirty,
  selectNotDeletedElements,
  selectNotDeletedExtensions,
} from "@/pageEditor/slices/editorSelectors";
import { isEqual } from "lodash";
import { ADAPTERS } from "@/pageEditor/starterBricks/adapter";
import { isInnerDefinitionRegistryId } from "@/types/helpers";

function useEnsureModComponentStarterBricks(): (
  modDefinition: ModDefinition,
) => Promise<boolean> {
  const modComponentFormStates = useSelector(selectNotDeletedElements);
  const activatedModComponents = useSelector(selectNotDeletedExtensions);
  const isDirtyByModComponentId = useSelector(selectDirty);

  /**
   * Checks the following invariants:
   *  - For each clean mod component, every entry in definitions should exist
   *    in the {modDefinition.definitions} object
   *  - For each dirty mod component with @internal extensionPoint definition,
   *    formState.extensionPoint.definition should exist in the
   *    {modDefinition.definitions} object, but the key may be different,
   *    e.g. "extensionPoint" vs. "extensionPoint3" in the modDefinition,
   *    also need to run it through the adapter because of some cleanup logic
   */
  return useCallback(
    async (modDefinition: UnsavedModDefinition) => {
      const modId = modDefinition.metadata.id;
      const definitionsFromMod = Object.values(modDefinition.definitions);

      // TODO: Extract to selectors and test clean/dirty separation behavior
      //        And reuse the same selectors in useSaveMod

      const dirtyModComponentFormStates = modComponentFormStates.filter(
        (modComponentFormState) =>
          modComponentFormState.recipe?.id === modId &&
          isDirtyByModComponentId[modComponentFormState.uuid],
      );

      for (const formState of dirtyModComponentFormStates) {
        if (
          !isInnerDefinitionRegistryId(formState.extensionPoint.metadata.id)
        ) {
          continue;
        }

        const { selectExtensionPointConfig } = ADAPTERS.get(formState.type);
        const definitionFromComponent = {
          kind: "extensionPoint",
          definition: selectExtensionPointConfig(formState).definition,
        };
        if (
          !definitionsFromMod.some((definitionFromMod) =>
            isEqual(definitionFromComponent, definitionFromMod),
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
            ),
        );

      for (const cleanModComponent of cleanModComponentsExcludingDirtyFormStates) {
        if (
          Object.values(cleanModComponent.definitions).some(
            (definitionFromComponent) =>
              !definitionsFromMod.some((definitionFromMod) =>
                isEqual(definitionFromComponent, definitionFromMod),
              ),
          )
        ) {
          return false;
        }
      }

      return true;
    },
    [activatedModComponents, isDirtyByModComponentId, modComponentFormStates],
  );
}

export default useEnsureModComponentStarterBricks;
