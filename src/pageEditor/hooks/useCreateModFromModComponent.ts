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
import { type ModMetadataFormState } from "@/pageEditor/pageEditorTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import reportEvent from "@/telemetry/reportEvent";
import { uuidv4 } from "@/types/helpers";
import produce from "immer";
import { useCallback } from "react";
import { Events } from "@/telemetry/events";
import {
  useCreateModDefinitionMutation,
  useDeleteStandaloneModDefinitionMutation,
} from "@/data/service/api";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import useUpsertModComponentFormState from "@/pageEditor/hooks/useUpsertModComponentFormState";
import { selectModMetadata } from "@/pageEditor/utils";
import { selectKeepLocalCopyOnCreateMod } from "@/pageEditor/slices/editorSelectors";
import { useRemoveModComponentFromStorage } from "@/pageEditor/hooks/useRemoveModComponentFromStorage";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { BusinessError } from "@/errors/businessErrors";

type UseCreateModFromModReturn = {
  createModFromComponent: (
    modComponentFormState: ModComponentFormState,
    modMetadata: ModMetadataFormState,
  ) => Promise<void>;
};

function useCreateModFromModComponent(
  activeModComponent: ModComponentFormState,
): UseCreateModFromModReturn {
  const dispatch = useDispatch();
  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateMod);
  const [createMod] = useCreateModDefinitionMutation();
  const upsertModComponentFormState = useUpsertModComponentFormState();
  const removeModComponentFromStorage = useRemoveModComponentFromStorage();
  const { buildAndValidateMod } = useBuildAndValidateMod();
  const [deleteStandaloneModDefinition] =
    useDeleteStandaloneModDefinitionMutation();

  const createModFromComponent = useCallback(
    (
      modComponentFormState: ModComponentFormState,
      modMetadata: ModMetadataFormState,
      // eslint-disable-next-line @typescript-eslint/promise-function-async -- permissions check must be called in the user gesture context, `async-await` can break the call chain
    ) =>
      ensureModComponentFormStatePermissionsFromUserGesture(
        modComponentFormState,
        // eslint-disable-next-line promise/prefer-await-to-then -- permissions check must be called in the user gesture context, `async-await` can break the call chain
      ).then(async (hasPermissions) => {
        if (!hasPermissions) {
          return;
        }

        const newModComponentFormState = produce(
          activeModComponent,
          (draft) => {
            draft.uuid = uuidv4();
          },
        );

        try {
          const newModDefinition = await buildAndValidateMod({
            newModComponentFormState,
            dirtyModMetadata: modMetadata,
          });

          const upsertResponse = await createMod({
            modDefinition: newModDefinition,
            organizations: [],
            public: false,
          }).unwrap();

          const newModComponent = produce(newModComponentFormState, (draft) => {
            draft.modMetadata = selectModMetadata(
              newModDefinition,
              upsertResponse,
            );
          });

          dispatch(editorActions.addModComponentFormState(newModComponent));

          await upsertModComponentFormState({
            modComponentFormState: newModComponent,
            options: {
              // Don't push to cloud since we're saving it with the mod
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
            await Promise.all([
              // @since v2.0.5 - Remove standalone mod definition on the server as well as locally,
              //  when the user converts to a mod and chooses not to keep a copy. This helps clean
              //  up existing standalone mod components that shouldn't be needed any longer. If the
              //  user wants to keep the standalone mod component around, they can simply choose
              //  the "keep local copy" option when converting to a mod.
              //  Also since v2.0.5, saving a standalone mod component in the page editor will call
              //  this create hook with keepLocalCopy forced to false.
              deleteStandaloneModDefinition({
                extensionId: activeModComponent.uuid,
              }),
              removeModComponentFromStorage({
                modComponentId: activeModComponent.uuid,
              }),
            ]);
          }

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
