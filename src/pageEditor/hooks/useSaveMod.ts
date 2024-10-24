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
  selectGetDraftModComponentsForMod,
} from "@/pageEditor/store/editor/editorSelectors";
import {
  useGetEditablePackagesQuery,
  useUpdateModDefinitionMutation,
} from "@/data/service/api";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { type RegistryId } from "@/types/registryTypes";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { ensureModComponentFormStatePermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import type { EditablePackageMetadata } from "@/types/contract";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import useBuildAndValidateMod, {
  DataIntegrityError,
} from "@/pageEditor/hooks/useBuildAndValidateMod";
import { reloadModsEveryTab } from "@/contentScript/messenger/api";
import { assertNotNullish } from "@/utils/nullishUtils";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import {
  isModComponentFormState,
  mapModDefinitionUpsertResponseToModDefinition,
} from "@/pageEditor/utils";
import updateReduxForSavedModDefinition from "@/pageEditor/hooks/updateReduxForSavedModDefinition";
import { isSpecificError } from "@/errors/errorHelpers";
import { type AppDispatch } from "@/pageEditor/store/store";

/** @internal */
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
  const dispatch = useDispatch<AppDispatch>();
  const {
    data: modDefinitions,
    isLoading: isModDefinitionsLoading,
    error: modDefinitionsError,
  } = useAllModDefinitions();
  const { data: editablePackages, isLoading: isEditablePackagesLoading } =
    useGetEditablePackagesQuery();
  const [updateModDefinitionOnServer] = useUpdateModDefinitionMutation();
  const getDraftModComponentsForMod = useSelector(
    selectGetDraftModComponentsForMod,
  );
  const dirtyModOptionsDefinitionsMap = useSelector(
    selectDirtyModOptionsDefinitions,
  );
  const dirtyModMetadataMap = useSelector(selectDirtyModMetadata);

  const { buildAndValidateMod } = useBuildAndValidateMod();

  const saveMod = useCallback(
    async (modId: RegistryId): Promise<boolean> => {
      if (isInnerDefinitionRegistryId(modId)) {
        dispatch(
          editorActions.showCreateModModal({ keepLocalCopy: false, modId }),
        );
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

      const sourceModDefinition = modDefinitions.find(
        (x) => x.metadata.id === modId,
      );
      if (sourceModDefinition == null) {
        notify.error({
          message:
            "You no longer have access to this mod package. Please reload the Page Editor.",
        });
        return false;
      }

      if (!isModEditable(editablePackages, sourceModDefinition)) {
        dispatch(editorActions.showSaveAsNewModModal());
        return false;
      }

      const draftModComponents = getDraftModComponentsForMod(modId);

      // XXX: this might need to come before the confirmation modal in order to avoid timout if the user takes too
      // long to confirm?
      // Check permissions as early as possible
      void ensureModComponentFormStatePermissionsFromUserGesture(
        draftModComponents.filter((x) => isModComponentFormState(x)),
      );

      const unsavedModDefinition = await buildAndValidateMod({
        sourceModDefinition,
        draftModComponents,
        // eslint-disable-next-line security/detect-object-injection -- mod IDs are sanitized in the form validation
        dirtyModOptionsDefinition: dirtyModOptionsDefinitionsMap[modId],
        // eslint-disable-next-line security/detect-object-injection -- mod IDs are sanitized in the form validation
        dirtyModMetadata: dirtyModMetadataMap[modId],
      });

      const packageId = editablePackages.find(
        // Bricks endpoint uses "name" instead of id
        (x) => x.name === modId,
      )?.id;

      assertNotNullish(
        packageId,
        "Package ID is required to upsert a mod definition",
      );

      const upsertResponse = await updateModDefinitionOnServer({
        packageId,
        modDefinition: unsavedModDefinition,
      }).unwrap();

      await dispatch(
        updateReduxForSavedModDefinition({
          modIdToReplace: modId,
          modDefinition: mapModDefinitionUpsertResponseToModDefinition(
            unsavedModDefinition,
            upsertResponse,
          ),
          draftModComponents,
          isReactivate: true,
        }),
      );

      reportEvent(Events.PAGE_EDITOR_MOD_UPDATE, {
        modId,
      });

      return true;
    },
    [
      dirtyModMetadataMap,
      dirtyModOptionsDefinitionsMap,
      getDraftModComponentsForMod,
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
          message: "Error loading mod definitions",
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
          notify.success(`Mod created successfully: ${modId}`);

          notify.success("Saved mod");
          reloadModsEveryTab();
        }
      } catch (error) {
        if (isSpecificError(error, DataIntegrityError)) {
          dispatch(editorActions.showSaveDataIntegrityErrorModal());
          return;
        }

        notify.error({
          message: "Error saving mod",
          error,
        });
      }
    },
    [
      dispatch,
      isEditablePackagesLoading,
      isModDefinitionsLoading,
      modDefinitionsError,
      saveMod,
    ],
  );
}

export default useSaveMod;
