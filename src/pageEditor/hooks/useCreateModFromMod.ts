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

import { useCreateRecipeMutation } from "@/data/service/api";
import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";
import useCheckModStarterBrickInvariants from "@/pageEditor/hooks/useCheckModStarterBrickInvariants";
import useCompareModComponentCounts from "@/pageEditor/hooks/useCompareModComponentCounts";
import useDeactivateMod from "@/pageEditor/hooks/useDeactivateMod";
import { type ModMetadataFormState } from "@/pageEditor/pageEditorTypes";
import { buildNewMod } from "@/pageEditor/panes/save/saveHelpers";
import {
  selectDirtyRecipeOptionDefinitions,
  selectKeepLocalCopyOnCreateRecipe,
} from "@/pageEditor/slices/editorSelectors";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/slices/selectors/selectGetCleanComponentsAndDirtyFormStatesForMod";
import { collectModOptions } from "@/store/extensionsUtils";
import reportEvent from "@/telemetry/reportEvent";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Events } from "@/telemetry/events";
import { actions as modComponentActions } from "@/store/extensionsSlice";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";

function useCreateModFromMod() {
  const dispatch = useDispatch();
  const [createMod] = useCreateRecipeMutation();
  const deactivateMod = useDeactivateMod();
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );
  const dirtyModOptions = useSelector(selectDirtyRecipeOptionDefinitions);
  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateRecipe);
  const compareModComponentCountsToModDefinition =
    useCompareModComponentCounts();
  const checkModStarterBrickInvariants = useCheckModStarterBrickInvariants();

  const createModFromMod = useCallback(
    async (modDefinition: ModDefinition, metadata: ModMetadataFormState) => {
      const modId = modDefinition.metadata.id;
      const { cleanModComponents, dirtyModComponentFormStates } =
        getCleanComponentsAndDirtyFormStatesForMod(modId);

      // eslint-disable-next-line security/detect-object-injection -- new recipe IDs are sanitized in the form validation
      const modOptions = dirtyModOptions[modId];

      const newModDefinition = buildNewMod({
        sourceMod: modDefinition,
        cleanModComponents,
        dirtyModComponentFormStates,
        dirtyModOptions: modOptions,
        dirtyModMetadata: metadata,
      });

      const modComponentDefinitionCountsMatch =
        compareModComponentCountsToModDefinition(newModDefinition);
      const modComponentStarterBricksMatch =
        await checkModStarterBrickInvariants(newModDefinition);

      if (
        !modComponentDefinitionCountsMatch ||
        !modComponentStarterBricksMatch
      ) {
        // Not including modDefinition because it can be 1.5MB+ in some rare cases
        // See discussion: https://github.com/pixiebrix/pixiebrix-extension/pull/7629/files#r1492864349
        reportEvent(Events.PAGE_EDITOR_MOD_SAVE_ERROR, {
          modId: newModDefinition.metadata.id,
          modComponentDefinitionCountsMatch,
          modComponentStarterBricksMatch,
        });
        dispatch(editorActions.showSaveDataIntegrityErrorModal());
        return false;
      }

      const upsertResponse = await createMod({
        recipe: newModDefinition,
        organizations: [],
        public: false,
      }).unwrap();

      const savedModDefinition: ModDefinition = {
        ...newModDefinition,
        sharing: {
          public: upsertResponse.public,
          organizations: upsertResponse.organizations,
        },
        updated_at: upsertResponse.updated_at,
      };

      if (!keepLocalCopy) {
        await deactivateMod({ modId, shouldShowConfirmation: false });
      }

      const modComponents = [
        ...dirtyModComponentFormStates,
        ...cleanModComponents,
      ];

      dispatch(
        modComponentActions.installMod({
          modDefinition: savedModDefinition,
          configuredDependencies: collectExistingConfiguredDependenciesForMod(
            savedModDefinition,
            modComponents,
          ),
          optionsArgs: collectModOptions(modComponents),
          screen: "pageEditor",
          isReinstall: false,
        }),
      );
      dispatch(editorActions.selectRecipeId(savedModDefinition.metadata.id));

      reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
        copiedFrom: modId,
        modId: savedModDefinition.metadata.id,
      });
    },
    [
      getCleanComponentsAndDirtyFormStatesForMod,
      dirtyModOptions,
      compareModComponentCountsToModDefinition,
      checkModStarterBrickInvariants,
      createMod,
      keepLocalCopy,
      dispatch,
      deactivateMod,
    ],
  );

  return {
    createModFromMod,
  };
}

export default useCreateModFromMod;
