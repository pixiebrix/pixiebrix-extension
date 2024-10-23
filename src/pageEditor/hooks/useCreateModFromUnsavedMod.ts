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

import { ensureModComponentFormStatePermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import { type ModMetadataFormState } from "@/pageEditor/store/editor/pageEditorTypes";
import reportEvent from "@/telemetry/reportEvent";
import produce from "immer";
import { useCallback } from "react";
import { Events } from "@/telemetry/events";
import { useCreateModDefinitionMutation } from "@/data/service/api";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import {
  mapModDefinitionUpsertResponseToModDefinition,
  mapModDefinitionUpsertResponseToModMetadata,
} from "@/pageEditor/utils";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { BusinessError } from "@/errors/businessErrors";
import { type RegistryId } from "@/types/registryTypes";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/selectGetCleanComponentsAndDirtyFormStatesForMod";
import { selectDirtyModOptionsDefinitions } from "@/pageEditor/store/editor/editorSelectors";
import { createPrivateSharing } from "@/utils/registryUtils";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";
import { collectModOptionsArgs } from "@/store/modComponents/modComponentUtils";
import { getModComponentItemId } from "@/pageEditor/modListingPanel/common";

type UseCreateModFromUnsavedModReturn = {
  createModFromUnsavedMod: (
    unsavedModId: RegistryId,
    modMetadata: ModMetadataFormState,
  ) => Promise<void>;
};

/**
 * This hook provides a callback function to create a mod from an unsaved mod
 * that has never been saved to the server.
 */
function useCreateModFromUnsavedMod(): UseCreateModFromUnsavedModReturn {
  const dispatch = useDispatch();
  const [createModDefinitionOnServer] = useCreateModDefinitionMutation();
  const { buildAndValidateMod } = useBuildAndValidateMod();
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );
  const dirtyModOptionsById = useSelector(selectDirtyModOptionsDefinitions);

  /**
   * Save a new, unsaved mod to the server.
   *
   * @param unsavedModId The (local only) registry ID of the unsaved mod
   * @param modMetadata The metadata for the new mod to be created
   */
  const createModFromUnsavedMod = useCallback(
    (
      unsavedModId: RegistryId,
      newModMetadata: ModMetadataFormState,
      // eslint-disable-next-line @typescript-eslint/promise-function-async -- permissions check must be called in the user gesture context, `async-await` can break the call chain
    ) => {
      const { cleanModComponents, dirtyModComponentFormStates } =
        getCleanComponentsAndDirtyFormStatesForMod(unsavedModId);
      // eslint-disable-next-line security/detect-object-injection -- RegistryId
      const dirtyModOptionsDefinition = dirtyModOptionsById[unsavedModId];

      return ensureModComponentFormStatePermissionsFromUserGesture(
        dirtyModComponentFormStates,
        // eslint-disable-next-line promise/prefer-await-to-then -- permissions check must be called in the user gesture context, `async-await` can break the call chain
      ).then(async (hasPermissions) => {
        if (!hasPermissions) {
          return;
        }

        try {
          const newModId = unsavedModId;

          const unsavedModDefinition = await buildAndValidateMod({
            dirtyModComponentFormStates,
            cleanModComponents,
            dirtyModMetadata: newModMetadata,
            dirtyModOptionsDefinition,
          });

          const upsertResponse = await createModDefinitionOnServer({
            modDefinition: unsavedModDefinition,
            ...createPrivateSharing(),
          }).unwrap();

          const modDefinition = mapModDefinitionUpsertResponseToModDefinition(
            unsavedModDefinition,
            upsertResponse,
          );

          const modMetadata = mapModDefinitionUpsertResponseToModMetadata(
            unsavedModDefinition,
            upsertResponse,
          );

          // Match the order that's in buildNewMod
          const modComponents = [
            ...cleanModComponents,
            ...dirtyModComponentFormStates,
          ];

          dispatch(
            modComponentActions.activateMod({
              modDefinition,
              modComponentIds: modComponents.map((x) =>
                getModComponentItemId(x),
              ),
              configuredDependencies:
                collectExistingConfiguredDependenciesForMod(
                  modDefinition,
                  modComponents,
                ),
              optionsArgs: collectModOptionsArgs(modComponents),
              screen: "pageEditor",
              isReactivate: false,
            }),
          );

          // Mod component cleanup
          for (const formStateToUpdate of dirtyModComponentFormStates) {
            // Can't use updateModMetadataOnModComponentFormStates because the mod id changed from the temporary
            // id to the new id of the package
            dispatch(
              editorActions.setModComponentFormState({
                modComponentFormState: produce(formStateToUpdate, (draft) => {
                  draft.modMetadata = modMetadata;
                }),
                dirty: false,
                includesNonFormikChanges: true,
              }),
            );

            dispatch(
              editorActions.markModComponentFormStateAsClean(
                formStateToUpdate.uuid,
              ),
            );
          }

          // Mod cleanup
          dispatch(
            editorActions.clearMetadataAndOptionsChangesForMod(newModId),
          );
          dispatch(
            editorActions.clearDeletedModComponentFormStatesForMod(newModId),
          );

          // Navigation Cleanup
          dispatch(editorActions.setActiveModId(newModId));

          reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
            modId: unsavedModDefinition.metadata.id,
          });
        } catch (error) {
          if (error instanceof BusinessError) {
            // Error is already handled by buildAndValidateMod.
          } else {
            throw error;
          } // Other errors can be thrown during mod activation
        }
      });
    },
    [
      getCleanComponentsAndDirtyFormStatesForMod,
      dirtyModOptionsById,
      buildAndValidateMod,
      createModDefinitionOnServer,
      dispatch,
    ],
  );

  return {
    createModFromUnsavedMod,
  };
}

export default useCreateModFromUnsavedMod;
