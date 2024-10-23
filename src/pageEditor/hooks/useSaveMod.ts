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

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectDirtyModMetadata,
  selectDirtyModOptionsDefinitions,
} from "@/pageEditor/store/editor/editorSelectors";
import {
  useGetEditablePackagesQuery,
  useUpdateModDefinitionMutation,
} from "@/data/service/api";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { type RegistryId } from "@/types/registryTypes";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { ensureModComponentFormStatePermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import type { EditablePackageMetadata } from "@/types/contract";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/selectGetCleanComponentsAndDirtyFormStatesForMod";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { reloadModsEveryTab } from "@/contentScript/messenger/api";
import { assertNotNullish } from "@/utils/nullishUtils";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { mapModDefinitionUpsertResponseToModMetadata } from "@/pageEditor/utils";
import { getModComponentItemId } from "@/pageEditor/modListingPanel/common";
import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";
import { collectModOptionsArgs } from "@/store/modComponents/modComponentUtils";

const { actions: modComponentActions } = modComponentSlice;

// Exported for testing
export function isModEditable(
  editablePackages: EditablePackageMetadata[],
  modDefinition: ModDefinition,
): boolean {
  // The user might lose access to the mod while they were editing it (the mod or a mod component)
  // See https://github.com/pixiebrix/pixiebrix-extension/issues/2813
  const modId = modDefinition?.metadata?.id;
  return modId != null && editablePackages.some((x) => x.name === modId);
}

/**
 * Returns a callback to save a mod by id, accounting for changed components,
 * activation options definitions, and mod metadata. Also validates the saved
 * mod and shows/notifies errors for various bad data states.
 */
function useSaveMod(): (modId: RegistryId) => Promise<void> {
  const dispatch = useDispatch();
  const {
    data: modDefinitions,
    isLoading: isModDefinitionsLoading,
    error: modDefinitionsError,
  } = useAllModDefinitions();
  const { data: editablePackages, isLoading: isEditablePackagesLoading } =
    useGetEditablePackagesQuery();
  const [updateModDefinitionOnServer] = useUpdateModDefinitionMutation();
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );
  const allDirtyModOptionsDefinitions = useSelector(
    selectDirtyModOptionsDefinitions,
  );
  const allDirtyModMetadatas = useSelector(selectDirtyModMetadata);

  const { buildAndValidateMod } = useBuildAndValidateMod();

  const saveMod = useCallback(
    async (modId: RegistryId): Promise<boolean> => {
      if (isInnerDefinitionRegistryId(modId)) {
        dispatch(editorActions.showCreateModModal({ keepLocalCopy: false }));
        return false;
      }

      assertNotNullish(
        modDefinitions,
        "saveMod called without modDefinitions loaded",
      );
      assertNotNullish(
        editablePackages,
        "saveMod called without editablePackages loaded",
      );

      const modDefinition = modDefinitions.find(
        (mod) => mod.metadata.id === modId,
      );
      if (modDefinition == null) {
        notify.error({
          message:
            "You no longer have edit permissions for the mod. Please reload the Page Editor.",
        });
        return false;
      }

      if (!isModEditable(editablePackages, modDefinition)) {
        dispatch(editorActions.showSaveAsNewModModal());
        return false;
      }

      const { cleanModComponents, dirtyModComponentFormStates } =
        getCleanComponentsAndDirtyFormStatesForMod(modId);

      // XXX: this might need to come before the confirmation modal in order to avoid timout if the user takes too
      // long to confirm?
      // Check permissions as early as possible
      void ensureModComponentFormStatePermissionsFromUserGesture(
        dirtyModComponentFormStates,
      );

      // Dirty options/metadata or null if there are no staged changes.
      // eslint-disable-next-line security/detect-object-injection -- mod IDs are sanitized in the form validation
      const dirtyModOptionsDefinition = allDirtyModOptionsDefinitions[modId];
      // eslint-disable-next-line security/detect-object-injection -- mod IDs are sanitized in the form validation
      const dirtyModMetadata = allDirtyModMetadatas[modId];

      const newMod = await buildAndValidateMod({
        sourceModDefinition: modDefinition,
        cleanModComponents,
        dirtyModComponentFormStates,
        dirtyModOptionsDefinition,
        dirtyModMetadata,
      });

      const packageId = editablePackages.find(
        // Bricks endpoint uses "name" instead of id
        (x) => x.name === newMod.metadata.id,
      )?.id;

      assertNotNullish(packageId, "Package ID is required to upsert a mod");

      const upsertResponse = await updateModDefinitionOnServer({
        packageId,
        modDefinition: newMod,
      }).unwrap();

      const newModMetadata = mapModDefinitionUpsertResponseToModMetadata(
        newMod,
        upsertResponse,
      );

      // Reactivate the Mod
      dispatch(modComponentActions.removeModById(newModMetadata.id));

      // Match the order that's in buildNewMod
      const modComponents = [
        ...cleanModComponents,
        ...dirtyModComponentFormStates,
      ];

      dispatch(
        modComponentActions.activateMod({
          modDefinition,
          modComponentIds: modComponents.map((x) => getModComponentItemId(x)),
          configuredDependencies: collectExistingConfiguredDependenciesForMod(
            modDefinition,
            modComponents,
          ),
          optionsArgs: collectModOptionsArgs(modComponents),
          screen: "pageEditor",
          isReactivate: false,
        }),
      );

      // Update the mod metadata on mod components in editorSlice and clear the dirty state
      dispatch(
        editorActions.updateModMetadataOnModComponentFormStates(newModMetadata),
      );
      dispatch(
        editorActions.clearMetadataAndOptionsChangesForMod(newModMetadata.id),
      );
      dispatch(
        editorActions.clearDeletedModComponentFormStatesForMod(
          newModMetadata.id,
        ),
      );

      reportEvent(Events.PAGE_EDITOR_MOD_UPDATE, {
        modId: newMod.metadata.id,
      });

      return true;
    },
    [
      allDirtyModMetadatas,
      allDirtyModOptionsDefinitions,
      getCleanComponentsAndDirtyFormStatesForMod,
      buildAndValidateMod,
      dispatch,
      editablePackages,
      modDefinitions,
      updateModDefinitionOnServer,
    ],
  );

  return useCallback(
    async (modId: RegistryId) => {
      if (modDefinitionsError) {
        notify.error({
          message: "Error fetching mod definitions",
          error: modDefinitionsError,
        });

        return;
      }

      if (isModDefinitionsLoading || isEditablePackagesLoading) {
        notify.error({
          message: "Mod definitions not loaded yet. Try again.",
        });

        return;
      }

      try {
        const success = await saveMod(modId);
        if (success) {
          notify.success("Saved mod");
          reloadModsEveryTab();
        }
      } catch (error) {
        notify.error({
          message: "Failed saving mod",
          error,
        });
      }
    },
    [
      isEditablePackagesLoading,
      isModDefinitionsLoading,
      modDefinitionsError,
      saveMod,
    ],
  );
}

export default useSaveMod;
