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

import { editorSlice } from "@/pageEditor/store/editor/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import notify from "@/utils/notify";
import { getErrorMessage } from "@/errors/errorHelpers";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { getLinkedApiClient } from "@/data/service/apiClient";
import { objToYaml } from "@/utils/objToYaml";
import { modComponentWithInnerDefinitions } from "@/pageEditor/starterBricks/base";
import { useGetEditablePackagesQuery } from "@/data/service/api";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { ensureModComponentFormStatePermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import { type UUID } from "@/types/stringTypes";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { DefinitionKinds, type RegistryId } from "@/types/registryTypes";
import { reloadModsEveryTab } from "@/contentScript/messenger/api";
import { assertNotNullish } from "@/utils/nullishUtils";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import { nowTimestamp } from "@/utils/timeUtils";
import { API_PATHS } from "@/data/service/urlPaths";

const { saveModComponent } = modComponentSlice.actions;
const { markClean } = editorSlice.actions;

async function upsertPackageConfig(
  packageUUID: UUID | null,
  kind: "reader" | "extensionPoint",
  config: unknown,
): Promise<void> {
  const client = await getLinkedApiClient();

  const data = { config: objToYaml(config as UnknownObject), kind };

  if (packageUUID) {
    await client.put(API_PATHS.BRICK(packageUUID), data);
  } else {
    await client.post(API_PATHS.BRICKS, data);
  }
}

function selectErrorMessage(error: unknown): string {
  // FIXME: should this logic be in getErrorMessage?
  if (isSingleObjectBadRequestError(error)) {
    return (
      // FIXME: won't the data on each property be an array?
      error.response?.data.config?.toString() ??
      error.response?.statusText ??
      "No response from PixieBrix server"
    );
  }

  return getErrorMessage(error);
}

type SaveOptions = {
  /**
   * Should the permissions be checked before saving?
   */
  checkPermissions: boolean;
  /**
   * Should the user be notified of the save?
   */
  notifySuccess: boolean;
  /**
   * Should mods be reactivated on all tabs?
   */
  reactivateEveryTab: boolean;
};

/**
 * @returns errorMessage an error message, or null if no error occurred
 */
type SaveCallback = (config: {
  modComponentFormState: ModComponentFormState;
  options: SaveOptions;
  modId?: RegistryId;
}) => Promise<string | null>;

function onStepError(error: unknown, step: string): string {
  const message = selectErrorMessage(error);
  console.warn("Error %s: %s", step, message, { error });
  const errorMessage = `Error ${step}: ${message}`;
  notify.error({ message: errorMessage, error });

  return errorMessage;
}

/**
 * Hook that returns a callback to save a Mod Component Form State in Redux.
 */
function useUpsertModComponentFormState(): SaveCallback {
  // XXX: Some users have problems when saving from the Page Editor that seem to indicate the sequence of events doesn't
  //  occur in the correct order on slower (CPU or network?) machines. Therefore, await all promises. We also have to
  //  make `reactivate` behave deterministically if we're still having problems (right now it's implemented as a
  //  fire-and-forget notification).

  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const { data: editablePackages } = useGetEditablePackagesQuery();

  const saveModComponentFormState = useCallback(
    async (
      modComponentFormState: ModComponentFormState,
      options: SaveOptions,
      modId?: RegistryId,
    ): Promise<string | null> => {
      if (options.checkPermissions) {
        // Good to prompt the creator for permissions if any is missing, but they're not actually required to save
        void ensureModComponentFormStatePermissionsFromUserGesture(
          modComponentFormState,
        );
      }

      const { selectStarterBrickDefinition, selectModComponent } =
        adapterForComponent(modComponentFormState);

      const starterBrickId = modComponentFormState.starterBrick.metadata.id;
      const hasInnerStarterBrick = isInnerDefinitionRegistryId(starterBrickId);

      let isEditable = false;

      // Handle the case where the Page Editor is also editing a starter brick that exists as a registry item
      if (!hasInnerStarterBrick) {
        assertNotNullish(editablePackages, "Editable packages not loaded");
        // PERFORMANCE: inefficient, grabbing all visible bricks prior to save. Not a big deal for now given
        // number of bricks implemented and frequency of saves
        isEditable =
          editablePackages.some((x) => x.name === starterBrickId) ?? false;

        const isLocked = modComponentFormState.installed && !isEditable;

        if (!isLocked) {
          try {
            const starterBrickConfig = selectStarterBrickDefinition(
              modComponentFormState,
            );
            const packageId = modComponentFormState.installed
              ? editablePackages.find(
                  // Bricks endpoint uses "name" instead of id
                  (x) => x.name === starterBrickConfig.metadata?.id,
                )?.id ?? null
              : null;

            await upsertPackageConfig(
              packageId,
              DefinitionKinds.STARTER_BRICK,
              starterBrickConfig,
            );
          } catch (error) {
            return onStepError(error, "saving foundation");
          }
        }
      }

      reportEvent(Events.PAGE_EDITOR_MOD_COMPONENT_UPDATE, {
        sessionId,
        type: modComponentFormState.starterBrick.definition.type,
        modId,
      });

      try {
        let modComponent = selectModComponent(modComponentFormState);
        const updateTimestamp = nowTimestamp();

        if (hasInnerStarterBrick) {
          const { definition } = selectStarterBrickDefinition(
            modComponentFormState,
          );
          modComponent = modComponentWithInnerDefinitions(
            modComponent,
            definition,
          );
        }

        dispatch(
          saveModComponent({
            modComponent: {
              ...modComponent,
              // Note that it is unfortunately the client's responsibility to make sure the `updateTimestamp` is the
              // same in Redux as it is on the server.
              updateTimestamp,
            },
          }),
        );

        dispatch(markClean(modComponentFormState.uuid));
      } catch (error) {
        return onStepError(error, "saving mod");
      }

      if (options.reactivateEveryTab) {
        reloadModsEveryTab();
      }

      if (options.notifySuccess) {
        notify.success("Saved mod");
      }

      return null;
    },
    [dispatch, editablePackages, sessionId],
  );

  return useCallback(
    async ({ modComponentFormState, options, modId }) => {
      try {
        return await saveModComponentFormState(
          modComponentFormState,
          options,
          modId,
        );
      } catch (error) {
        console.error("Error saving mod", { error });
        notify.error({
          message: "Error saving mod",
          error,
        });
        return "Save error";
      }
    },
    [saveModComponentFormState],
  );
}

export default useUpsertModComponentFormState;
