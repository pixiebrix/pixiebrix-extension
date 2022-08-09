/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";
import { extensionPermissions } from "@/permissions";
import { requestPermissions } from "@/utils/permissions";
import { getLinkedApiClient } from "@/services/apiClient";
import { objToYaml } from "@/utils/objToYaml";
import { extensionWithInnerDefinitions } from "@/pageEditor/extensionPoints/base";
import { useGetEditablePackagesQuery } from "@/services/api";
import { UnknownObject } from "@/types";
import extensionsSlice from "@/store/extensionsSlice";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { isInnerExtensionPoint } from "@/registry/internal";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import useRefresh from "@/hooks/useRefresh";

const { saveExtension } = extensionsSlice.actions;
const { markSaved } = editorSlice.actions;

async function upsertConfig(
  packageUUID: string | null,
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

async function ensurePermissions(element: FormState) {
  const adapter = ADAPTERS.get(element.type);

  const { extension, extensionPoint: extensionPointConfig } =
    adapter.asDynamicElement(element);

  const extensionPoint = extensionPointFactory(extensionPointConfig);

  // Pass the extensionPoint in directly because the foundation will not have been saved/added to the
  // registry at this point when called from useCreate
  const permissions = await extensionPermissions(extension, {
    extensionPoint,
  });

  console.debug("Ensuring permissions", {
    permissions,
    extensionPointConfig,
    extension,
  });

  const hasPermissions = await requestPermissions(permissions);

  if (!hasPermissions) {
    notify.warning(
      "You declined the additional required permissions. This brick won't work on other tabs until you grant the permissions"
    );
  }
}

/**
 * @param element the page editor formik state
 * @param pushToCloud true to save a copy of the extension to the user's account
 * @returns errorMessage an error message, or null if no error error occurred
 */
type CreateCallback = (config: {
  element: FormState;
  pushToCloud: boolean;
}) => Promise<string | null>;

function useCreate(): CreateCallback {
  // XXX: Some users have problems when saving from the Page Editor that seem to indicate the sequence of events doesn't
  //  occur in the correct order on slower (CPU or network?) machines. Therefore, await all promises. We also have to
  //  make `reactivate` behave deterministically if we're still having problems (right now it's implemented as a
  //  fire-and-forget notification).

  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const { data: editablePackages } = useGetEditablePackagesQuery();
  const [_, refreshRegistries] = useRefresh({ refreshOnMount: false });

  return useCallback(
    async ({ element, pushToCloud }): Promise<string | null> => {
      const onStepError = (error: unknown, step: string): string => {
        const message = selectErrorMessage(error);
        console.warn("Error %s: %s", step, message, { error });
        const errorMessage = `Error ${step}: ${message}`;
        notify.error({ message: errorMessage, error });

        return errorMessage;
      };

      try {
        try {
          // Make sure the pages have the latest bricks for when we reactivate below
          // NOTE: This must run before the permissions check (below), because we
          // need to look up service definitions as part of checking permissions.
          await refreshRegistries();
        } catch (error) {
          notify.warning({
            message: `Error fetching remote bricks: ${selectErrorMessage(
              error
            )}`,
            includeErrorDetails: false, // Using `selectErrorMessage` locally
            error,
            reportError: true,
          });
        }

        // eslint-disable-next-line promise/prefer-await-to-then -- It specifically does not need to be awaited #2775
        void ensurePermissions(element).catch((error) => {
          console.error("Error checking/enabling permissions", { error });
          notify.warning({
            message:
              "An error occurred checking/enabling permissions. Grant permissions on the Active Bricks page",
            error,
            reportError: true,
          });
        });

        const adapter = ADAPTERS.get(element.type);

        const extensionPointId = element.extensionPoint.metadata.id;
        const hasInnerExtensionPoint = isInnerExtensionPoint(extensionPointId);

        let isEditable = false;

        if (!hasInnerExtensionPoint) {
          // PERFORMANCE: inefficient, grabbing all visible bricks prior to save. Not a big deal for now given
          // number of bricks implemented and frequency of saves
          isEditable = editablePackages.some(
            (x) => x.name === extensionPointId
          );

          const isLocked = element.installed && !isEditable;

          if (!isLocked) {
            try {
              const extensionPointConfig =
                adapter.selectExtensionPoint(element);
              const packageId = element.installed
                ? editablePackages.find(
                    // Bricks endpoint uses "name" instead of id
                    (x) => x.name === extensionPointConfig.metadata.id
                  )?.id
                : null;

              await upsertConfig(
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
            const extensionPointConfig = adapter.selectExtensionPoint(element);
            dispatch(
              saveExtension({
                extension: extensionWithInnerDefinitions(
                  rawExtension,
                  extensionPointConfig.definition
                ),
                pushToCloud,
              })
            );
          } else {
            dispatch(saveExtension({ extension: rawExtension, pushToCloud }));
          }

          dispatch(markSaved(element.uuid));
        } catch (error) {
          return onStepError(error, "saving extension");
        }

        reactivateEveryTab();

        notify.success("Saved extension");
        return null;
      } catch (error) {
        console.error("Error saving extension", { error });
        notify.error({
          message: "Error saving extension",
          error,
        });
        return "Error saving extension";
      }
    },
    [dispatch, sessionId, editablePackages]
  );
}

export default useCreate;
