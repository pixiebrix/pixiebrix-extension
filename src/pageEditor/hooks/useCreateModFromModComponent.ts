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
import { useCallback } from "react";
import { Events } from "@/telemetry/events";
import { useCreateModDefinitionMutation } from "@/data/service/api";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { mapModDefinitionUpsertResponseToModDefinition } from "@/pageEditor/utils";
import useDeleteDraftModComponent from "@/pageEditor/hooks/useDeleteDraftModComponent";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { createPrivateSharing } from "@/utils/registryUtils";
import updateReduxForSavedModDefinition from "@/pageEditor/hooks/updateReduxForSavedModDefinition";
import { type AppDispatch } from "@/pageEditor/store/store";
import { selectGetSiblingDraftModComponents } from "@/pageEditor/store/editor/editorSelectors";

type UseCreateModFromModReturn = {
  createModFromComponent: (
    modComponentFormState: ModComponentFormState,
    modMetadata: ModMetadataFormState,
    options: { keepLocalCopy: boolean },
  ) => Promise<void>;
};

function useCreateModFromModComponent(): UseCreateModFromModReturn {
  const dispatch = useDispatch<AppDispatch>();
  const [createModDefinitionOnServer] = useCreateModDefinitionMutation();
  const deleteDraftModComponent = useDeleteDraftModComponent();
  const { buildAndValidateMod } = useBuildAndValidateMod();
  const getSiblingDraftModComponents = useSelector(
    selectGetSiblingDraftModComponents,
  );

  const createModFromComponent = useCallback(
    (
      modComponentFormState: ModComponentFormState,
      newModMetadata: ModMetadataFormState,
      { keepLocalCopy }: { keepLocalCopy: boolean },
      // eslint-disable-next-line @typescript-eslint/promise-function-async -- permissions check must be called in the user gesture context, `async-await` can break the call chain
    ) =>
      ensureModComponentFormStatePermissionsFromUserGesture(
        modComponentFormState,
        // eslint-disable-next-line promise/prefer-await-to-then -- permissions check must be called in the user gesture context, `async-await` can break the call chain
      ).then(async (hasPermissions) => {
        if (!hasPermissions) {
          return;
        }

        if (
          !keepLocalCopy &&
          getSiblingDraftModComponents(modComponentFormState.uuid).length === 1
        ) {
          throw new Error("Cannot remove the last starter brick in a mod");
        }

        const modId = newModMetadata.id;
        const draftModComponents = [modComponentFormState];

        const unsavedModDefinition = await buildAndValidateMod({
          draftModComponents,
          dirtyModMetadata: newModMetadata,
        });

        const upsertResponse = await createModDefinitionOnServer({
          modDefinition: unsavedModDefinition,
          ...createPrivateSharing(),
        }).unwrap();

        await dispatch(
          updateReduxForSavedModDefinition({
            modDefinition: mapModDefinitionUpsertResponseToModDefinition(
              unsavedModDefinition,
              upsertResponse,
            ),
            // Safe to pass form state that has the old mod component ID because the form states are only used
            // to determine mod option args and integration dependencies
            draftModComponents,
            isReactivate: false,
          }),
        );

        dispatch(editorActions.setActiveModId(modId));

        if (!keepLocalCopy) {
          // Delete the mod component from the source mod
          await deleteDraftModComponent({
            modComponentId: modComponentFormState.uuid,
          });
        }

        reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
          modId,
        });
      }),
    [
      buildAndValidateMod,
      createModDefinitionOnServer,
      dispatch,
      deleteDraftModComponent,
      getSiblingDraftModComponents,
    ],
  );

  return {
    createModFromComponent,
  };
}

export default useCreateModFromModComponent;
