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

import { ensureModComponentFormStatePermissionsFromUserGesture } from "../editorPermissionsHelpers";
import { type ModMetadataFormState } from "../store/editor/pageEditorTypes";
import { type ModComponentFormState } from "../starterBricks/formStateTypes";
import reportEvent from "../../telemetry/reportEvent";
import { useCallback } from "react";
import { Events } from "../../telemetry/events";
import { useCreateModDefinitionMutation } from "@/data/service/api";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "../store/editor/editorSlice";
import { mapModDefinitionUpsertResponseToModDefinition } from "../utils";
import useDeleteDraftModComponent from "./useDeleteDraftModComponent";
import useBuildAndValidateMod from "./useBuildAndValidateMod";
import { createPrivateSharing } from "../../utils/registryUtils";
import updateReduxForSavedModDefinition from "./updateReduxForSavedModDefinition";
import { type AppDispatch } from "../store/store";
import { selectGetSiblingDraftModComponents } from "../store/editor/editorSelectors";

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

        // Prevent removal of the last mod component in a mod. The editorSlice state currently stores some mod
        // information on the mod components/form state. In practice, this code should never get hit because the
        // Page Editor should show the deletion affordances as disabled.
        if (
          !keepLocalCopy &&
          getSiblingDraftModComponents(modComponentFormState.uuid).length === 1
        ) {
          throw new Error("Cannot move the last starter brick in a mod");
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
