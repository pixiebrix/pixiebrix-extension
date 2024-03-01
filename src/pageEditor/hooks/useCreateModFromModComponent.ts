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

import { ensureElementPermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import { type ModMetadataFormState } from "@/pageEditor/pageEditorTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import reportEvent from "@/telemetry/reportEvent";
import { uuidv4 } from "@/types/helpers";
import produce from "immer";
import { useCallback } from "react";
import { Events } from "@/telemetry/events";
import { useCreateRecipeMutation } from "@/data/service/api";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import useUpsertModComponentFormState from "@/pageEditor/hooks/useUpsertModComponentFormState";
import { selectModMetadata } from "@/pageEditor/utils";
import { selectKeepLocalCopyOnCreateRecipe } from "@/pageEditor/slices/editorSelectors";
import { useRemoveModComponentFromStorage } from "@/pageEditor/hooks/useRemoveModComponentFromStorage";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";

function useCreateModFromModComponent(
  activeModComponent: ModComponentFormState,
) {
  const dispatch = useDispatch();
  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateRecipe);
  const [createMod] = useCreateRecipeMutation();
  const upsertModComponentFormState = useUpsertModComponentFormState();
  const removeModComponentFromStorage = useRemoveModComponentFromStorage();
  const { buildAndValidateMod } = useBuildAndValidateMod();

  const createModFromComponent = useCallback(
    (
      modComponentFormState: ModComponentFormState,
      modMetadata: ModMetadataFormState,
      // eslint-disable-next-line @typescript-eslint/promise-function-async -- permissions check must be called in the user gesture context, `async-await` can break the call chain
    ) =>
      // eslint-disable-next-line promise/prefer-await-to-then -- permissions check must be called in the user gesture context, `async-await` can break the call chain
      ensureElementPermissionsFromUserGesture(modComponentFormState).then(
        async (hasPermissions) => {
          if (!hasPermissions) {
            return;
          }

          let modComponent = produce(activeModComponent, (draft) => {
            draft.uuid = uuidv4();
          });

          try {
            const newModDefinition = await buildAndValidateMod({
              cleanModComponents: [],
              dirtyModComponentFormStates: [modComponent],
              dirtyModMetadata: modMetadata,
            });

            const upsertResponse = await createMod({
              recipe: newModDefinition,
              organizations: [],
              public: false,
            }).unwrap();

            modComponent = produce(modComponent, (draft) => {
              draft.recipe = selectModMetadata(
                newModDefinition,
                upsertResponse,
              );
            });

            dispatch(editorActions.addElement(modComponent));

            await upsertModComponentFormState({
              element: modComponent,
              options: {
                // Don't push to cloud since we're saving it with the recipe
                pushToCloud: false,
                // Permissions are already checked above
                checkPermissions: false,
                // Need to provide user feedback
                notifySuccess: true,
                reactivateEveryTab: true,
              },
              modId: newModDefinition.metadata.id,
            });

            if (!keepLocalCopy) {
              await removeModComponentFromStorage({
                extensionId: activeModComponent.uuid,
              });
            }

            reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
              modId: newModDefinition.metadata.id,
            });
          } catch {
            // Error is already handled by buildAndValidateMod. Re-thrown to prevent further processing.
          }
        },
      ),
    [
      activeModComponent,
      buildAndValidateMod,
      createMod,
      dispatch,
      upsertModComponentFormState,
      keepLocalCopy,
      removeModComponentFromStorage,
    ],
  );

  return {
    createModFromComponent,
  };
}

export default useCreateModFromModComponent;
