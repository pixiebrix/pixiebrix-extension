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
import { useCallback, useMemo } from "react";
import { Events } from "@/telemetry/events";
import {
  useCreateModDefinitionMutation,
  useGetEditablePackagesQuery,
} from "@/data/service/api";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { mapModDefinitionUpsertResponseToModMetadata } from "@/pageEditor/utils";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { BusinessError } from "@/errors/businessErrors";
import { type Nullishable } from "@/utils/nullishUtils";
import { type RegistryId } from "@/types/registryTypes";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/selectGetCleanComponentsAndDirtyFormStatesForMod";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { type UUID } from "@/types/stringTypes";
import { getLinkedApiClient } from "@/data/service/apiClient";
import { objToYaml } from "@/utils/objToYaml";
import { API_PATHS } from "@/data/service/urlPaths";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { modComponentWithInnerDefinitions } from "@/pageEditor/starterBricks/base";
import { selectDirtyModOptionsDefinitions } from "@/pageEditor/store/editor/editorSelectors";

async function saveStarterBrickConfig(
  packageUuid: UUID,
  config: StarterBrickDefinitionLike,
): Promise<void> {
  const client = await getLinkedApiClient();
  const data = { config: objToYaml(config), kind: "extensionPoint" };
  await client.put(API_PATHS.BRICK(packageUuid), data);
}

type UseCreateModFromUnsavedModReturn = {
  createModFromUnsavedMod: (modMetadata: ModMetadataFormState) => Promise<void>;
};

function useCreateModFromUnsavedMod(
  unsavedModId: Nullishable<RegistryId>,
): UseCreateModFromUnsavedModReturn {
  const dispatch = useDispatch();
  const [createMod] = useCreateModDefinitionMutation();
  const { data: editablePackages } = useGetEditablePackagesQuery();
  const { buildAndValidateMod } = useBuildAndValidateMod();
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );
  const { cleanModComponents, dirtyModComponentFormStates } = useMemo(
    () => getCleanComponentsAndDirtyFormStatesForMod(unsavedModId ?? null),
    [getCleanComponentsAndDirtyFormStatesForMod, unsavedModId],
  );
  const dirtyModOptionsById = useSelector(selectDirtyModOptionsDefinitions);
  const dirtyModOptionsDefinition = useMemo(
    // eslint-disable-next-line security/detect-object-injection -- Registry id
    () => (unsavedModId ? dirtyModOptionsById[unsavedModId] : undefined),
    [dirtyModOptionsById, unsavedModId],
  );

  const createModFromUnsavedMod = useCallback(
    (
      modMetadata: ModMetadataFormState,
      // eslint-disable-next-line @typescript-eslint/promise-function-async -- permissions check must be called in the user gesture context, `async-await` can break the call chain
    ) =>
      ensureModComponentFormStatePermissionsFromUserGesture(
        dirtyModComponentFormStates,
        // eslint-disable-next-line promise/prefer-await-to-then -- permissions check must be called in the user gesture context, `async-await` can break the call chain
      ).then(async (hasPermissions) => {
        if (!hasPermissions || !unsavedModId || !editablePackages) {
          return;
        }

        try {
          const newModDefinition = await buildAndValidateMod({
            dirtyModComponentFormStates,
            cleanModComponents,
            dirtyModMetadata: modMetadata,
            dirtyModOptionsDefinition,
          });

          const upsertResponse = await createMod({
            modDefinition: newModDefinition,
            organizations: [],
            public: false,
          }).unwrap();

          const newComponentFormStates = dirtyModComponentFormStates.map(
            (dirtyModComponentFormState) =>
              produce(dirtyModComponentFormState, (draft) => {
                draft.modMetadata = mapModDefinitionUpsertResponseToModMetadata(
                  newModDefinition,
                  upsertResponse,
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

            // Starter brick exists as a registry item
            if (hasInnerStarterBrick) {
              const { definition } = selectStarterBrickDefinition(
                newComponentFormState,
              );
              newModComponent = modComponentWithInnerDefinitions(
                newModComponent,
                definition,
              );
            } else {
              const editablePackage = editablePackages.find(
                ({ name }) => name === starterBrickId,
              );
              if (editablePackage?.id != null) {
                const starterBrickConfig = selectStarterBrickDefinition(
                  newComponentFormState,
                );
                // eslint-disable-next-line no-await-in-loop -- There aren't that many of these registry starter bricks for now
                await saveStarterBrickConfig(
                  editablePackage.id,
                  starterBrickConfig,
                );
              }
            }

            dispatch(
              editorActions.syncModComponentFormState(newComponentFormState),
            );
            dispatch(
              modComponentActions.saveModComponent({
                modComponent: {
                  ...newModComponent,
                  updateTimestamp: upsertResponse.updated_at,
                },
              }),
            );
            dispatch(editorActions.markClean(newComponentFormState.uuid));
          }

          const newModId = newModDefinition.metadata.id;
          dispatch(editorActions.resetMetadataAndOptionsForMod(newModId));
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
      }),
    [
      dirtyModComponentFormStates,
      unsavedModId,
      buildAndValidateMod,
      cleanModComponents,
      createMod,
      dispatch,
    ],
  );

  return {
    createModFromUnsavedMod,
  };
}

export default useCreateModFromUnsavedMod;
