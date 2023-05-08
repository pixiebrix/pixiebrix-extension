/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import notify from "@/utils/notify";
import { getErrorMessage } from "@/errors/errorHelpers";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { reactivateEveryTab } from "@/background/messenger/api";
import { reportEvent } from "@/telemetry/events";
import { getLinkedApiClient } from "@/services/apiClient";
import { objToYaml } from "@/utils/objToYaml";
import { extensionWithInnerDefinitions } from "@/pageEditor/extensionPoints/base";
import { useGetEditablePackagesQuery } from "@/services/api";
import { type UnknownObject } from "@/types/objectTypes";
import extensionsSlice from "@/store/extensionsSlice";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { ensureElementPermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import { type UUID } from "@/types/stringTypes";
import { isInnerDefinitionRef } from "@/types/registryTypes";

const { saveExtension } = extensionsSlice.actions;
const { markSaved } = editorSlice.actions;

async function upsertPackageConfig(
  packageUUID: UUID | null,
  kind: "reader" | "extensionPoint",
  config: unknown
): Promise<void> {
  const client = await getLinkedApiClient();

  const data = { config: objToYaml(config as UnknownObject), kind };

  if (packageUUID) {
    await client.put(`api/bricks/${packageUUID}/`, data);
  } else {
    await client.post("api/bricks/", data);
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
   * True to save a copy of the IExtension to the user's account
   */
  pushToCloud: boolean;
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
 * @param element the page editor formik state

 * @param checkPermissions
 * @returns errorMessage an error message, or null if no error occurred
 */
type SaveCallback = (config: {
  element: FormState;
  options: SaveOptions;
}) => Promise<string | null>;

function onStepError(error: unknown, step: string): string {
  const message = selectErrorMessage(error);
  console.warn("Error %s: %s", step, message, { error });
  const errorMessage = `Error ${step}: ${message}`;
  notify.error({ message: errorMessage, error });

  return errorMessage;
}

/**
 * Hook to create/update a single IExtension defined by the Page Editor FormState.
 */
function useUpsertFormElement(): SaveCallback {
  // XXX: Some users have problems when saving from the Page Editor that seem to indicate the sequence of events doesn't
  //  occur in the correct order on slower (CPU or network?) machines. Therefore, await all promises. We also have to
  //  make `reactivate` behave deterministically if we're still having problems (right now it's implemented as a
  //  fire-and-forget notification).

  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const { data: editablePackages } = useGetEditablePackagesQuery();

  const saveElement = useCallback(
    async (
      element: FormState,
      options: SaveOptions
    ): Promise<string | null> => {
      if (options.checkPermissions) {
        // Good to prompt the creator for permissions if any is missing, but they're not actually required to save
        void ensureElementPermissionsFromUserGesture(element);
      }

      const adapter = ADAPTERS.get(element.type);

      const extensionPointId = element.extensionPoint.metadata.id;
      const hasInnerExtensionPoint = isInnerDefinitionRef(extensionPointId);

      let isEditable = false;

      // Handle the case where the Page Editor is also editing an extension point that exists as a registry item
      if (!hasInnerExtensionPoint) {
        // PERFORMANCE: inefficient, grabbing all visible bricks prior to save. Not a big deal for now given
        // number of bricks implemented and frequency of saves
        isEditable = editablePackages.some((x) => x.name === extensionPointId);

        const isLocked = element.installed && !isEditable;

        if (!isLocked) {
          try {
            const extensionPointConfig =
              adapter.selectExtensionPointConfig(element);
            const packageId = element.installed
              ? editablePackages.find(
                  // Bricks endpoint uses "name" instead of id
                  (x) => x.name === extensionPointConfig.metadata.id
                )?.id
              : null;

            await upsertPackageConfig(
              packageId,
              "extensionPoint",
              extensionPointConfig
            );
          } catch (error) {
            return onStepError(error, "saving foundation");
          }
        }
      }

      reportEvent("PageEditorCreate", {
        sessionId,
        type: element.type,
      });

      try {
        const rawExtension = adapter.selectExtension(element);
        if (hasInnerExtensionPoint) {
          const extensionPointConfig =
            adapter.selectExtensionPointConfig(element);
          dispatch(
            saveExtension({
              extension: extensionWithInnerDefinitions(
                rawExtension,
                extensionPointConfig.definition
              ),
              pushToCloud: options.pushToCloud,
            })
          );
        } else {
          dispatch(
            saveExtension({
              extension: rawExtension,
              pushToCloud: options.pushToCloud,
            })
          );
        }

        dispatch(markSaved(element.uuid));
      } catch (error) {
        return onStepError(error, "saving extension");
      }

      if (options.reactivateEveryTab) {
        reactivateEveryTab();
      }

      if (options.notifySuccess) {
        notify.success("Saved mod");
      }

      return null;
    },
    [dispatch, editablePackages, sessionId]
  );

  return useCallback(
    async ({ element, options }) => {
      try {
        return await saveElement(element, options);
      } catch (error) {
        console.error("Error saving mod", { error });
        notify.error({
          message: "Error saving mod",
          error,
        });
        return "Save error";
      }
    },
    [saveElement]
  );
}

export default useUpsertFormElement;
