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
import type { InnerDefinitions, RegistryId } from "@/types/registryTypes";
import {
  selectIsModComponentDirtyById,
  selectNotDeletedModComponentFormStates,
  selectNotDeletedActivatedModComponents,
} from "@/pageEditor/slices/editorSelectors";
import { buildModComponents } from "@/pageEditor/panes/save/saveHelpers";
import produce from "immer";
import { isStarterBrickDefinitionLike } from "@/starterBricks/types";

export const selectGetCleanComponentsAndDirtyFormStatesForMod = createSelector(
  selectNotDeletedActivatedModComponents,
  selectNotDeletedModComponentFormStates,
  selectIsModComponentDirtyById,
  (activatedModComponents, formStates, isDirtyByComponentId) =>
    (modId: RegistryId) => {
      const dirtyModComponentFormStates = formStates.filter(
        (formState) =>
          formState.recipe?.id === modId &&
          isDirtyByComponentId[formState.uuid],
      );
      const cleanModComponents = activatedModComponents.filter(
        (modComponent) =>
          modComponent._recipe?.id === modId &&
          !dirtyModComponentFormStates.some(
            (formState) => formState.uuid === modComponent.id,
          ),
      );

      const { extensionPoints } = buildModComponents(cleanModComponents);
      const referencedIds = new Set(extensionPoints.map((x) => x.id));

      return {
        // @see saveHelpers.ts:deleteUnusedStarterBrickDefinitions
        cleanModComponents: cleanModComponents.map((modComponent) =>
          produce(modComponent, (draft) => {
            const definitions = draft.definitions ?? ({} as InnerDefinitions);

            for (const [innerDefinitionId, innerDefinition] of Object.entries(
              modComponent.definitions,
            )) {
              if (
                isStarterBrickDefinitionLike(innerDefinition) &&
                referencedIds.has(innerDefinitionId)
              ) {
                // PageEditor state may include unused starter bricks, so we only include the ones that are actually used
                // eslint-disable-next-line security/detect-object-injection -- Object.entries
                definitions[innerDefinitionId] = innerDefinition;
              }
            }

            draft.definitions = definitions;

            return draft;
          }),
        ),
        dirtyModComponentFormStates,
      };
    },
);
