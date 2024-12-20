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

import { useCreateModDefinitionMutation } from "@/data/service/api";
import useDeactivateMod from "@/pageEditor/hooks/useDeactivateMod";
import { type ModMetadataFormState } from "@/pageEditor/store/editor/pageEditorTypes";
import {
  selectGetDraftModComponentsForMod,
  selectGetModDraftStateForModId,
} from "@/pageEditor/store/editor/editorSelectors";
import reportEvent from "@/telemetry/reportEvent";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Events } from "@/telemetry/events";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { ensureModComponentFormStatePermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import {
  isModComponentFormState,
  mapModDefinitionUpsertResponseToModDefinition,
} from "@/pageEditor/utils";
import { createPrivateSharing } from "@/utils/registryUtils";
import updateReduxForSavedModDefinition from "@/pageEditor/hooks/updateReduxForSavedModDefinition";
import { type AppDispatch } from "@/pageEditor/store/store";

type UseCreateModFromModReturn = {
  createModFromMod: (
    modDefinition: ModDefinition,
    metadata: ModMetadataFormState,
    options: { keepLocalCopy: boolean },
  ) => Promise<void>;
};

/**
 * This hook provides a callback function to create a mod copy from the
 * existing, active mod that HAS been saved on the server before.
 */
function useCreateModFromMod(): UseCreateModFromModReturn {
  const dispatch = useDispatch<AppDispatch>();
  const [createModDefinitionOnServer] = useCreateModDefinitionMutation();
  const deactivateMod = useDeactivateMod();
  const getDraftModComponentsForMod = useSelector(
    selectGetDraftModComponentsForMod,
  );
  const getModDraftStateForModId = useSelector(selectGetModDraftStateForModId);
  const { buildAndValidateMod } = useBuildAndValidateMod();

  const createModFromMod = useCallback(
    async (
      sourceModDefinition: ModDefinition,
      newModMetadata: ModMetadataFormState,
      { keepLocalCopy }: { keepLocalCopy: boolean },
    ) => {
      const sourceModId = sourceModDefinition.metadata.id;

      if (sourceModId === newModMetadata.id) {
        throw new Error(
          "Expected new mod ID to be different from source mod ID",
        );
      }

      const draftModComponents = getDraftModComponentsForMod(sourceModId);

      return ensureModComponentFormStatePermissionsFromUserGesture(
        draftModComponents.filter((x) => isModComponentFormState(x)),
        // eslint-disable-next-line promise/prefer-await-to-then -- permissions check must be called in the user gesture context, `async-await` can break the call chain
      ).then(async (hasPermissions) => {
        if (!hasPermissions) {
          return;
        }

        const newModId = newModMetadata.id;
        const draftModState = getModDraftStateForModId(sourceModId);

        const unsavedModDefinition = await buildAndValidateMod({
          sourceModDefinition,
          // Pass the metadata for the new mod, but the draft state from the source mod
          dirtyModMetadata: newModMetadata,
          draftModComponents,
          dirtyModOptionsDefinition: draftModState.dirtyModOptionsDefinition,
          dirtyModVariablesDefinition: draftModState.variablesDefinition,
        });

        const upsertResponse = await createModDefinitionOnServer({
          modDefinition: unsavedModDefinition,
          ...createPrivateSharing(),
        }).unwrap();

        await dispatch(
          updateReduxForSavedModDefinition({
            // In the future, could consider passing the source mod id here if keepLocalCopy is false so that Page
            // Editor navigation state is preserved for the source mod form states
            modIdToReplace: undefined,
            modDefinition: mapModDefinitionUpsertResponseToModDefinition(
              unsavedModDefinition,
              upsertResponse,
            ),
            draftModComponents,
            isReactivate: false,
          }),
        );

        dispatch(editorActions.setActiveModId(newModId));

        if (!keepLocalCopy) {
          await deactivateMod({
            modId: sourceModDefinition.metadata.id,
            shouldShowConfirmation: false,
          });
        }

        reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
          copiedFrom: sourceModId,
          modId: newModId,
        });
      });
    },
    [
      getDraftModComponentsForMod,
      getModDraftStateForModId,
      buildAndValidateMod,
      createModDefinitionOnServer,
      dispatch,
      deactivateMod,
    ],
  );

  return {
    createModFromMod,
  };
}

export default useCreateModFromMod;
