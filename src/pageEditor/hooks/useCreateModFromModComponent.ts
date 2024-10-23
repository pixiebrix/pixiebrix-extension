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
import { selectKeepLocalCopyOnCreateMod } from "@/pageEditor/store/editor/editorSelectors";
import useDeleteDraftModComponent from "@/pageEditor/hooks/useDeleteDraftModComponent";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { createPrivateSharing } from "@/utils/registryUtils";
import updateReduxForSavedModDefinition from "@/pageEditor/hooks/updateReduxForSavedModDefinition";

type UseCreateModFromModReturn = {
  createModFromComponent: (
    modComponentFormState: ModComponentFormState,
    modMetadata: ModMetadataFormState,
  ) => Promise<void>;
};

function useCreateModFromModComponent(
  activeModComponentFormState: Nullishable<ModComponentFormState>,
): UseCreateModFromModReturn {
  const dispatch = useDispatch();
  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateMod);
  const [createModDefinitionOnServer] = useCreateModDefinitionMutation();
  const deleteDraftModComponent = useDeleteDraftModComponent();
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
        assertNotNullish(
          activeModComponentFormState,
          "Expected mod component to be selected",
        );

        if (!hasPermissions) {
          return;
        }

        const modId = newModMetadata.id;
        const draftModComponents = [activeModComponentFormState];

        const unsavedModDefinition = await buildAndValidateMod({
          draftModComponents,
          dirtyModMetadata: newModMetadata,
        });

        const upsertResponse = await createModDefinitionOnServer({
          modDefinition: unsavedModDefinition,
          ...createPrivateSharing(),
        }).unwrap();

        await updateReduxForSavedModDefinition({
          dispatch,
          modDefinition: mapModDefinitionUpsertResponseToModDefinition(
            unsavedModDefinition,
            upsertResponse,
          ),
          // Safe to pass form state that has the old mod component ID because the form states are only used
          // to determine mod option args and integration dependencies
          draftModComponents,
          isReactivate: false,
        });

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
      activeModComponentFormState,
      buildAndValidateMod,
      createModDefinitionOnServer,
      dispatch,
      keepLocalCopy,
      deleteDraftModComponent,
    ],
  );

  return {
    createModFromComponent,
  };
}

export default useCreateModFromModComponent;
