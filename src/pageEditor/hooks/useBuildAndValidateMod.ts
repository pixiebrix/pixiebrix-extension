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
  buildNewMod,
  type ModParts,
} from "@/pageEditor/panes/save/saveHelpers";
import reportEvent from "@/telemetry/reportEvent";
import { useCallback } from "react";
import { Events } from "@/telemetry/events";
import { BusinessError } from "@/errors/businessErrors";
import useCheckModStarterBrickInvariants from "@/pageEditor/hooks/useCheckModStarterBrickInvariants";
import useCompareModComponentCounts from "@/pageEditor/hooks/useCompareModComponentCounts";
import { type JsonObject } from "type-fest";
import { type UnsavedModDefinition } from "@/types/modDefinitionTypes";
import { isEmpty } from "lodash";

type UseBuildAndValidateModReturn = {
  buildAndValidateMod: (
    modParts: Partial<ModParts>,
  ) => Promise<UnsavedModDefinition>;
};

/**
 * Error that a mod save failed due to data integrity check failures.
 */
export class DataIntegrityError extends BusinessError {
  override name = "DataIntegrityError";

  constructor() {
    super("Mod save failed due to data integrity error");
  }
}

function useBuildAndValidateMod(): UseBuildAndValidateModReturn {
  const compareModComponentCountsToModDefinition =
    useCompareModComponentCounts();
  const checkModStarterBrickInvariants = useCheckModStarterBrickInvariants();

  const buildAndValidateMod = useCallback(
    async ({
      sourceModDefinition,
      cleanModComponents = [],
      dirtyModComponentFormStates: existingDirtyModComponentFormStates = [],
      dirtyModOptionsDefinition,
      dirtyModMetadata,
    }: Partial<ModParts>) => {
      if (
        isEmpty(cleanModComponents) &&
        isEmpty(existingDirtyModComponentFormStates)
      ) {
        throw new Error("Expected mod components to save");
      }

      const dirtyModComponentFormStates = [
        ...existingDirtyModComponentFormStates,
      ];

      const newModDefinition = buildNewMod({
        sourceModDefinition,
        cleanModComponents,
        dirtyModComponentFormStates,
        dirtyModOptionsDefinition,
        dirtyModMetadata,
      });

      if (sourceModDefinition) {
        const modComponentDefinitionCountsMatch =
          compareModComponentCountsToModDefinition(
            newModDefinition,
            sourceModDefinition.metadata.id,
          );

        const modComponentStarterBricksMatch =
          await checkModStarterBrickInvariants(
            newModDefinition,
            sourceModDefinition.metadata.id,
          );

        if (
          !modComponentDefinitionCountsMatch ||
          !modComponentStarterBricksMatch
        ) {
          // Not including modDefinition because it can be 1.5MB+ in some rare cases
          // See discussion: https://github.com/pixiebrix/pixiebrix-extension/pull/7629/files#r1492864349
          reportEvent(Events.PAGE_EDITOR_MOD_SAVE_ERROR, {
            // Metadata is an object, but doesn't extend JsonObject so typescript doesn't like it
            modMetadata: newModDefinition.metadata as unknown as JsonObject,
            modComponentDefinitionCountsMatch,
            modComponentStarterBricksMatch,
          });

          throw new DataIntegrityError();
        }
      }

      return newModDefinition;
    },
    [checkModStarterBrickInvariants, compareModComponentCountsToModDefinition],
  );

  return { buildAndValidateMod };
}

export default useBuildAndValidateMod;
