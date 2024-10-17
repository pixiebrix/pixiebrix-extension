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
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import reportEvent from "@/telemetry/reportEvent";
import { uuidv4 } from "@/types/helpers";
import produce from "immer";
import { useCallback } from "react";
import { Events } from "@/telemetry/events";
import { useCreateModDefinitionMutation } from "@/data/service/api";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { mapModDefinitionUpsertResponseToModDefinition } from "@/pageEditor/utils";
import { selectKeepLocalCopyOnCreateMod } from "@/pageEditor/store/editor/editorSelectors";
import { useRemoveModComponentFromStorage } from "@/pageEditor/hooks/useRemoveModComponentFromStorage";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { BusinessError } from "@/errors/businessErrors";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import notify from "@/utils/notify";
import { createPrivateSharing } from "@/utils/registryUtils";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";
import { collectModOptions } from "@/store/modComponents/modComponentUtils";
import mapModDefinitionToModMetadata from "@/modDefinitions/util/mapModDefinitionToModMetadata";

type UseCreateModFromModReturn = {
  createModFromComponent: (
    modComponentFormState: ModComponentFormState,
    newModMetadata: ModMetadataFormState,
  ) => Promise<void>;
};

/**
 * Hook to create a new mod from a mod component, i.e., by copying/moving the mod component to a new mod.
 */
function useCreateModFromModComponent(
  sourceModComponentFormState: Nullishable<ModComponentFormState>,
): UseCreateModFromModReturn {
  const dispatch = useDispatch();

  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateMod);
  const [createModDefinitionOnServer] = useCreateModDefinitionMutation();
  const removeModComponentFromStorage = useRemoveModComponentFromStorage();
  const { buildAndValidateMod } = useBuildAndValidateMod();

  const createModFromComponent = useCallback(
    (
      modComponentFormState: ModComponentFormState,
      newModMetadata: ModMetadataFormState,
      // eslint-disable-next-line @typescript-eslint/promise-function-async -- permissions check must be called in the user gesture context, `async-await` can break the call chain
    ) =>
      ensureModComponentFormStatePermissionsFromUserGesture(
        modComponentFormState,
        // eslint-disable-next-line promise/prefer-await-to-then -- permissions check must be called in the user gesture context, `async-await` can break the call chain
      ).then(async (hasPermissions) => {
        if (!hasPermissions) {
          return;
        }

        assertNotNullish(
          sourceModComponentFormState,
          "Expected sourceModComponentFormState",
        );

        const newDirtyFormState = produce(
          sourceModComponentFormState,
          (draft) => {
            draft.uuid = uuidv4();
          },
        );

        try {
          const unsavedModDefinition = await buildAndValidateMod({
            dirtyModComponentFormStates: [newDirtyFormState],
            dirtyModMetadata: newModMetadata,
          });

          const createModDefinitionResponse = await createModDefinitionOnServer(
            {
              modDefinition: unsavedModDefinition,
              ...createPrivateSharing(),
            },
          ).unwrap();

          const modDefinition = mapModDefinitionUpsertResponseToModDefinition(
            unsavedModDefinition,
            createModDefinitionResponse,
          );

          const newFormState = produce(newDirtyFormState, (draft) => {
            draft.modMetadata = mapModDefinitionToModMetadata(modDefinition);
          });

          // Don't create the form states explicitly. They'll be created automatically if/when the user starts
          // editing the cloned mod component.
          dispatch(
            modComponentActions.activateMod({
              modDefinition,
              configuredDependencies:
                collectExistingConfiguredDependenciesForMod(modDefinition, [
                  newFormState,
                ]),
              optionsArgs: collectModOptions([newFormState]),
              screen: "pageEditor",
              isReactivate: false,
            }),
          );

          // Select the new mod
          dispatch(editorActions.setActiveModId(modDefinition.metadata.id));

          if (!keepLocalCopy) {
            await removeModComponentFromStorage({
              modComponentId: sourceModComponentFormState.uuid,
            });
          }

          dispatch(editorActions.checkAvailableActivatedModComponents());

          reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
            modId: unsavedModDefinition.metadata.id,
          });

          notify.success("Saved mod");
        } catch (error) {
          if (error instanceof BusinessError) {
            // Error is already handled by buildAndValidateMod.
          } else {
            throw error;
          } // Other errors can be thrown during mod activation
        }
      }),
    [
      sourceModComponentFormState,
      buildAndValidateMod,
      createModDefinitionOnServer,
      dispatch,
      keepLocalCopy,
      removeModComponentFromStorage,
    ],
  );

  return {
    createModFromComponent,
  };
}

export default useCreateModFromModComponent;
