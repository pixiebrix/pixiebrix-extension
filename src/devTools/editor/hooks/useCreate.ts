/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
  FormState,
  editorSlice,
  isCustomReader,
} from "@/devTools/editor/editorSlice";
import { useDispatch } from "react-redux";
import { useCallback, useState } from "react";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { makeURL } from "@/hooks/fetch";
import { safeDump } from "js-yaml";
import { getExtensionToken } from "@/auth/token";
import { optionsSlice } from "@/options/slices";
import { FormikHelpers } from "formik";
import { uniq } from "lodash";
import { AddToast, useToasts } from "react-toast-notifications";
import { reportError } from "@/telemetry/logging";
import blockRegistry from "@/blocks/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import { makeExtensionReaders } from "@/devTools/editor/extensionPoints/base";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import { reactivate } from "@/background/navigation";
import { reportEvent } from "@/telemetry/events";
import { removeUndefined } from "@/utils";
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";
import { ensureAllPermissions, extensionPermissions } from "@/permissions";

const { saveExtension } = optionsSlice.actions;
const { markSaved } = editorSlice.actions;

export interface EditablePackage {
  id: string;
  name: string;
}

async function makeRequestConfig(
  packageUUID: string
): Promise<AxiosRequestConfig> {
  if (packageUUID) {
    return {
      url: await makeURL(`api/bricks/${packageUUID}/`),
      method: "put",
      headers: { Authorization: `Token ${await getExtensionToken()}` },
    };
  } else {
    return {
      url: await makeURL("api/bricks/"),
      method: "post",
      headers: { Authorization: `Token ${await getExtensionToken()}` },
    };
  }
}

function selectErrorMessage(error: unknown): string {
  if (typeof error === "object" && (error as AxiosError).isAxiosError) {
    const error_ = error as AxiosError;
    return (
      error_.response?.data["config"]?.toString() ??
      error_.response?.statusText ??
      "No response from PixieBrix server"
    );
  }
  return error.toString();
}

/**
 * Dump to YAML, removing keys with undefined values.
 */
export function configToYaml(content: unknown): string {
  return safeDump(removeUndefined(content));
}

async function ensurePermissions(element: FormState, addToast: AddToast) {
  const adapter = ADAPTERS.get(element.type);

  const {
    extension,
    extensionPoint: extensionPointConfig,
  } = adapter.definition(element);

  const extensionPoint = await extensionPointFactory(extensionPointConfig);

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

  // FIXME: Firefox probably won't realize this permissions request is user-initiated
  const hasPermissions = await ensureAllPermissions(permissions);

  if (!hasPermissions) {
    addToast(
      `You declined the additional required permissions. This brick won't work on other tabs until you grant the permissions`,
      {
        appearance: "warning",
        autoDismiss: true,
      }
    );
  }
}

type CreateCallback = (
  element: FormState,
  helpers: FormikHelpers<FormState>
) => Promise<void>;

export function useCreate(): CreateCallback {
  const dispatch = useDispatch();
  const { addToast } = useToasts();
  const [savedReaders, setSavedReaders] = useState<string[]>([]);

  return useCallback(
    async (
      element: FormState,
      { setSubmitting, setStatus }: FormikHelpers<FormState>
    ) => {
      const onStepError = (error: unknown, step: string) => {
        const message = selectErrorMessage(error);
        reportError(error);
        console.warn(`Error %s: %s`, step, message, { error });
        setStatus(`Error ${step}: ${message}`);
        addToast(`Error ${step}: ${message}`, {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
      };

      try {
        const adapter = ADAPTERS.get(element.type);

        try {
          await ensurePermissions(element, addToast);
        } catch (error) {
          // continue to allow saving (because there's a workaround)
          reportError(error);
          console.error("Error  checking/enabling permissions", { error });
          addToast(
            `An error occurred checking/enabling permissions. Grant permissions on the Active Bricks page`,
            {
              appearance: "warning",
              autoDismiss: true,
            }
          );
        }

        // PERFORMANCE: inefficient, grabbing all visible bricks prior to save. Not a big deal for now given
        // number of bricks implemented and frequency of saves
        const { data: editablePackages } = await axios.get<EditablePackage[]>(
          await makeURL("api/bricks/"),
          {
            headers: { Authorization: `Token ${await getExtensionToken()}` },
          }
        );

        // Save the readers first
        try {
          const readerConfigs = makeExtensionReaders(element);
          for (const readerConfig of readerConfigs) {
            // FIXME: check for userscope here to determine editability?
            if (isCustomReader(readerConfig)) {
              console.debug("saving reader", {
                editablePackages,
                readerConfig,
                savedReaders,
              });
              // savedReaders is to handle case where save failed for the foundation, so subsequent saves needs
              // to update the reader
              const packageId =
                element.installed ||
                savedReaders.includes(readerConfig.metadata.id)
                  ? // bricks endpoint uses "name" instead of id
                    editablePackages.find(
                      (x) => x.name === readerConfig.metadata.id
                    )?.id
                  : null;

              await axios({
                ...(await makeRequestConfig(packageId)),
                data: { config: configToYaml(readerConfig), kind: "reader" },
              });

              setSavedReaders((prev) =>
                uniq([...prev, readerConfig.metadata.id])
              );
            }
          }
        } catch (error) {
          onStepError(error, "saving reader definition");
          return;
        }

        // Save the foundation second, which depends on the reader
        if (
          !element.installed ||
          editablePackages.some(
            (x) => x.name === element.extensionPoint.metadata.id
          )
        ) {
          try {
            const extensionPointConfig = adapter.extensionPoint(element);
            const packageId = element.installed
              ? editablePackages.find(
                  (x) => x.name === extensionPointConfig.metadata.id
                )?.id
              : null;

            console.debug("extensionPointConfig", { extensionPointConfig });

            await axios({
              ...(await makeRequestConfig(packageId)),
              data: {
                config: configToYaml(extensionPointConfig),
                kind: "extensionPoint",
              },
            });

            reportEvent("PageEditorCreate", {
              type: element.type,
            });
          } catch (error) {
            onStepError(error, "saving foundation");
            return;
          }
        }

        try {
          dispatch(saveExtension(adapter.extension(element)));
          dispatch(markSaved(element.uuid));
          void reactivate();
          addToast("Saved extension", {
            appearance: "success",
            autoDismiss: true,
          });
        } catch (error) {
          onStepError(error, "saving extension");
          return;
        }

        setSubmitting(false);

        await Promise.all([
          blockRegistry.fetch(),
          extensionPointRegistry.fetch(),
        ]);
      } catch (error) {
        console.error("Error saving extension", { error });
        reportError(error);
        addToast(`Error saving extension: ${error.toString()}`, {
          appearance: "error",
          autoDismiss: true,
        });
      }
    },
    [dispatch, addToast, setSavedReaders, savedReaders]
  );
}
