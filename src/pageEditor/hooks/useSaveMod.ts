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
import {
  isModDefinitionEditable,
  mapModDefinitionUpsertResponseToModDefinition,
} from "@/pageEditor/utils";
import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";
import { collectModOptions } from "@/store/modComponents/modComponentUtils";

const { actions: modComponentActions } = modComponentSlice;

const EMPTY_MOD_DEFINITIONS: ModDefinition[] = [];
const EMPTY_EDITABLE_PACKAGES: EditablePackageMetadata[] = [];

/**
 * Returns a callback to save a mod by id, accounting for changed components,
 * activation options definitions, and mod metadata. Also validates the saved
 * mod and shows/notifies errors for various bad data states.
 */
function useSaveMod(): (modId: RegistryId) => Promise<void> {
  const dispatch = useDispatch();
  const {
    data: modDefinitions = EMPTY_MOD_DEFINITIONS,
    isLoading: isModDefinitionsLoading,
    error: modDefinitionsError,
  } = useAllModDefinitions();
  const {
    data: editablePackages = EMPTY_EDITABLE_PACKAGES,
    isLoading: isEditablePackagesLoading,
  } = useGetEditablePackagesQuery();
  const [updateModDefinitionOnServer] = useUpdateModDefinitionMutation();
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );
  const allDirtyModOptionsDefinitions = useSelector(
    selectDirtyModOptionsDefinitions,
  );
  const allDirtyModMetadatas = useSelector(selectDirtyModMetadata);
  const { buildAndValidateMod } = useBuildAndValidateMod();

  const save = useCallback(
    async (modId: RegistryId): Promise<boolean> => {
      if (isInnerDefinitionRegistryId(modId)) {
        dispatch(editorActions.showCreateModModal({ keepLocalCopy: false }));
        return false;
      }

      const sourceModDefinition = modDefinitions.find(
        (mod) => mod.metadata.id === modId,
      );
      if (sourceModDefinition == null) {
        notify.error({
          message:
            "You no longer have edit permissions for the mod. Please reload the Page Editor.",
        });
        return false;
      }

      if (!isModDefinitionEditable(editablePackages, sourceModDefinition)) {
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

      const unsavedModDefinition = await buildAndValidateMod({
        sourceMod: sourceModDefinition,
        cleanModComponents,
        dirtyModComponentFormStates,
        // Dirty options/metadata or null if there are no staged changes.
        // eslint-disable-next-line security/detect-object-injection -- mod IDs are sanitized in the form validation
        dirtyModOptionsDefinition: allDirtyModOptionsDefinitions[modId],
        // eslint-disable-next-line security/detect-object-injection -- mod IDs are sanitized in the form validation
        dirtyModMetadata: allDirtyModMetadatas[modId],
      });

      // Get package surrogate UUID because registry edit endpoints uses the surrogate key instead of the registry ID
      const packageId = editablePackages.find(
        // Bricks endpoint uses "name" instead of id
        (x) => x.name === modId,
      )?.id;

      assertNotNullish(
        packageId,
        "You do not have permissions to edit this mod",
      );

      const upsertResponse = await updateModDefinitionOnServer({
        packageId,
        modDefinition: unsavedModDefinition,
      }).unwrap();

      const newModDefinition = mapModDefinitionUpsertResponseToModDefinition(
        unsavedModDefinition,
        upsertResponse,
      );

      const modComponents = [
        ...cleanModComponents,
        ...dirtyModComponentFormStates,
      ];

      dispatch(
        modComponentActions.activateMod({
          modDefinition: newModDefinition,
          configuredDependencies: collectExistingConfiguredDependenciesForMod(
            sourceModDefinition,
            modComponents,
          ),
          optionsArgs: collectModOptions(modComponents),
          screen: "pageEditor",
          isReactivate: true,
        }),
      );

      // TODO: reset dirty states on the editor, e.g., via same controls as useClearModChanges

      reportEvent(Events.PAGE_EDITOR_MOD_UPDATE, {
        modId,
      });

      return true;
    },
    [
      allDirtyModMetadatas,
      allDirtyModOptionsDefinitions,
      buildAndValidateMod,
      dispatch,
      editablePackages,
      getCleanComponentsAndDirtyFormStatesForMod,
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
        return;
      }

      try {
        const success = await save(modId);
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
      save,
    ],
  );
}

export default useSaveMod;
