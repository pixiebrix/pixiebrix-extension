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
import { mapModDefinitionUpsertResponseToModMetadata } from "@/pageEditor/utils";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { BusinessError } from "@/errors/businessErrors";
import { type RegistryId } from "@/types/registryTypes";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/selectGetCleanComponentsAndDirtyFormStatesForMod";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { modComponentWithInnerDefinitions } from "@/pageEditor/starterBricks/base";
import { selectDirtyModOptionsDefinitions } from "@/pageEditor/store/editor/editorSelectors";

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
  const [createMod] = useCreateModDefinitionMutation();
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
      modMetadata: ModMetadataFormState,
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
          const newModDefinition = await buildAndValidateMod({
            dirtyModComponentFormStates,
            cleanModComponents,
            dirtyModMetadata: modMetadata,
            dirtyModOptionsDefinition,
          });

          const createResponse = await createMod({
            modDefinition: newModDefinition,
            organizations: [],
            public: false,
          }).unwrap();

          const newComponentFormStates = dirtyModComponentFormStates.map(
            (dirtyModComponentFormState) =>
              produce(dirtyModComponentFormState, (draft) => {
                draft.modMetadata = mapModDefinitionUpsertResponseToModMetadata(
                  newModDefinition,
                  createResponse,
                );
              }),
          );

          for (const newComponentFormState of newComponentFormStates) {
            const { selectModComponent, selectStarterBrickDefinition } =
              adapterForComponent(newComponentFormState);
            const starterBrickId =
              newComponentFormState.starterBrick.metadata.id;
            const hasInnerStarterBrick =
              isInnerDefinitionRegistryId(starterBrickId);
            let newModComponent = selectModComponent(newComponentFormState);

            // The Page Editor only supports editing inline Starter Brick definitions, not Starter Brick packages.
            // Therefore, no logic is required here for Starter Brick registry packages.
            if (hasInnerStarterBrick) {
              // Starter brick has an inner definition and doesn't exist as a registry item
              const { definition } = selectStarterBrickDefinition(
                newComponentFormState,
              );
              newModComponent = modComponentWithInnerDefinitions(
                newModComponent,
                definition,
              );
            }

            dispatch(
              modComponentActions.saveModComponent({
                modComponent: {
                  ...newModComponent,
                  updateTimestamp: createResponse.updated_at,
                },
              }),
            );

            // TODO: remove use of setModComponentFormState: https://github.com/pixiebrix/pixiebrix-extension/issues/9323
            dispatch(
              editorActions.setModComponentFormState({
                modComponentFormState: newComponentFormState,
                includesNonFormikChanges: true,
                dirty: false,
              }),
            );
            dispatch(
              editorActions.markModComponentFormStateAsClean(
                newComponentFormState.uuid,
              ),
            );
          }

          const newModId = newModDefinition.metadata.id;
          dispatch(
            editorActions.clearMetadataAndOptionsChangesForMod(newModId),
          );
          dispatch(
            editorActions.clearDeletedModComponentFormStatesForMod(newModId),
          );
          dispatch(editorActions.setActiveModId(newModId));

          reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
            modId: newModDefinition.metadata.id,
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
      createMod,
      dispatch,
    ],
  );

  return {
    createModFromUnsavedMod,
  };
}

export default useCreateModFromUnsavedMod;
