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
import { useSelector } from "react-redux";
import { useCallback } from "react";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/selectGetCleanComponentsAndDirtyFormStatesForMod";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";

type SourceModParts = {
  sourceModDefinition?: ModDefinition;
  newModComponentFormState?: ModComponentFormState;
};

type RequiredModParts = Required<
  Pick<SourceModParts, "sourceModDefinition" | "newModComponentFormState">
>;

/**
 * @returns A function that compares the number of mod components in the redux state and the mod definition
 */
function useCompareModComponentCounts(): (
  unsavedModDefinition: UnsavedModDefinition,
  { sourceModDefinition, newModComponentFormState }: RequiredModParts,
) => boolean {
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );

  return useCallback(
    (
      unsavedModDefinition: UnsavedModDefinition,
      { sourceModDefinition, newModComponentFormState }: RequiredModParts,
    ) => {
      const modId = sourceModDefinition.metadata.id;
      const { cleanModComponents, dirtyModComponentFormStates } =
        getCleanComponentsAndDirtyFormStatesForMod(modId);

      if (newModComponentFormState) {
        dirtyModComponentFormStates.push(newModComponentFormState);
      }

      const totalNumberModComponentsFromState =
        cleanModComponents.length + dirtyModComponentFormStates.length;

      const totalNumberModComponentsFromDefinition =
        unsavedModDefinition.extensionPoints.length;

      return (
        totalNumberModComponentsFromState ===
        totalNumberModComponentsFromDefinition
      );
    },
    [getCleanComponentsAndDirtyFormStatesForMod],
  );
}

export default useCompareModComponentCounts;
