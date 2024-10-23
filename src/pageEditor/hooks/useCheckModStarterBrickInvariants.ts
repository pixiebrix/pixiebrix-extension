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
import { useCallback } from "react";
import { useSelector } from "react-redux";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import {
  isStarterBrickDefinitionLike,
  type StarterBrickDefinitionLike,
} from "@/starterBricks/types";
import { isInnerDefinitionEqual } from "@/starterBricks/starterBrickUtils";
import {
  DefinitionKinds,
  type InnerDefinitions,
  type RegistryId,
} from "@/types/registryTypes";
import produce from "immer";
import { buildModComponents } from "@/pageEditor/panes/save/saveHelpers";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/editorSelectors";

function useCheckModStarterBrickInvariants(): (
  unsavedModDefinition: UnsavedModDefinition,
  sourceModId: RegistryId,
) => Promise<boolean> {
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );

  /**
   * Checks the following invariants:
   *  - For each clean mod component, every entry in definitions should exist
   *    in the {modDefinition.definitions} object
   *  - For each dirty mod component with @internal starter brick definition,
   *    formState.starterBrick.definition should exist in the
   *    {modDefinition.definitions} object, but the key may be different,
   *    e.g. "extensionPoint" vs. "extensionPoint3" in the modDefinition,
   *    also need to run it through the adapter because of some cleanup logic
   */
  return useCallback(
    async (
      unsavedModDefinition: UnsavedModDefinition,
      sourceModId: RegistryId,
    ) => {
      const definitionsFromMod = Object.values(
        unsavedModDefinition.definitions ?? {},
      );

      const { cleanModComponents, dirtyModComponentFormStates } =
        getCleanComponentsAndDirtyFormStatesForMod(sourceModId);

      for (const formState of dirtyModComponentFormStates) {
        if (!isInnerDefinitionRegistryId(formState.starterBrick.metadata.id)) {
          continue;
        }

        const { selectStarterBrickDefinition } = adapterForComponent(formState);

        const definitionFromComponent = {
          kind: DefinitionKinds.STARTER_BRICK,
          definition: selectStarterBrickDefinition(formState).definition,
        } satisfies StarterBrickDefinitionLike;
        if (
          !definitionsFromMod.some((definitionFromMod) =>
            isInnerDefinitionEqual(definitionFromComponent, definitionFromMod),
          )
        ) {
          return false;
        }
      }

      const { modComponents } = buildModComponents(cleanModComponents);
      const referencedIds = new Set(modComponents.map((x) => x.id));

      // @see saveHelpers.ts:deleteUnusedStarterBrickDefinitions
      const normalizedModComponents = cleanModComponents.map((modComponent) =>
        produce(modComponent, (draft) => {
          delete draft.definitions;
          const definitions = {} as InnerDefinitions;

          for (const [innerDefinitionId, innerDefinition] of Object.entries(
            modComponent.definitions ?? {},
          )) {
            if (
              isStarterBrickDefinitionLike(innerDefinition) &&
              referencedIds.has(innerDefinitionId)
            ) {
              // The ActivatedModComponents may include unused starter bricks, so we only include the ones that are actually used
              // eslint-disable-next-line security/detect-object-injection -- Object.entries
              definitions[innerDefinitionId] = innerDefinition;
            }
          }

          draft.definitions = definitions;

          return draft;
        }),
      );

      for (const normalizedModComponent of normalizedModComponents) {
        if (
          Object.values(normalizedModComponent.definitions ?? {}).some(
            (definitionFromComponent) =>
              !definitionsFromMod.some((definitionFromMod) =>
                isInnerDefinitionEqual(
                  definitionFromComponent,
                  definitionFromMod,
                ),
              ),
          )
        ) {
          return false;
        }
      }

      return true;
    },
    [getCleanComponentsAndDirtyFormStatesForMod],
  );
}

export default useCheckModStarterBrickInvariants;
