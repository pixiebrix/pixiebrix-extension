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
  ActionFormState,
  editorSlice,
  isCustomReader,
} from "@/devTools/editor/editorSlice";
import { useDispatch } from "react-redux";
import { useCallback } from "react";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { makeURL } from "@/hooks/fetch";
import { safeDump } from "js-yaml";
import { getExtensionToken } from "@/auth/token";
import { optionsSlice } from "@/options/slices";
import { FormikHelpers } from "formik";
import { useToasts } from "react-toast-notifications";
import { reportError } from "@/telemetry/logging";
import blockRegistry from "@/blocks/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import { makeExtensionReaders } from "@/devTools/editor/extensionPoints/base";
import {
  makeActionConfig,
  makeActionExtension,
  makeMenuExtensionPoint,
} from "@/devTools/editor/extensionPoints/menuItem";
import { makeTriggerConfig } from "@/devTools/editor/extensionPoints/trigger";
import { makePanelConfig } from "@/devTools/editor/extensionPoints/panel";
import { makeContextMenuConfig } from "@/devTools/editor/extensionPoints/contextMenu";

const { saveExtension } = optionsSlice.actions;
const { markSaved } = editorSlice.actions;

export const CONFIG_MAP = {
  menuItem: makeActionConfig,
  trigger: makeTriggerConfig,
  panel: makePanelConfig,
  contextMenu: makeContextMenuConfig,
};

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

export function useCreate(): (
  button: ActionFormState,
  helpers: FormikHelpers<ActionFormState>
) => Promise<void> {
  const dispatch = useDispatch();
  const { addToast } = useToasts();

  return useCallback(
    async (
      button: ActionFormState,
      { setSubmitting, setStatus }: FormikHelpers<ActionFormState>
    ) => {
      console.debug("Updating/creating action", { button });

      if (button.type !== "menuItem") {
        addToast(`Saving for ${button.type} not implemented`, {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
        return;
      }

      // PERFORMANCE: inefficient, grabbing all visible bricks prior to save
      const { data: editable } = await axios.get<EditablePackage[]>(
        await makeURL("api/bricks/"),
        {
          headers: { Authorization: `Token ${await getExtensionToken()}` },
        }
      );

      try {
        const readerConfigs = makeExtensionReaders(button);
        for (const readerConfig of readerConfigs) {
          // FIXME: check for userscope here to determine editability?
          if (isCustomReader(readerConfig)) {
            const packageId = button.installed
              ? // bricks endpoint uses "name" instead of id
                editable.find((x) => x.name === readerConfig.metadata.id)?.id
              : null;
            await axios({
              ...(await makeRequestConfig(packageId)),
              data: { config: safeDump(readerConfig), kind: "reader" },
            } as AxiosRequestConfig);
          }
        }
      } catch (ex) {
        const err = ex as AxiosError;
        const msg =
          err.response.data["config"]?.toString() ?? err.response.statusText;
        setStatus(`Error saving reader: ${msg}`);
        addToast(`Error saving reader definition: ${msg}`, {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
        return;
      }

      if (
        !button.installed ||
        editable.find((x) => x.name === button.extensionPoint.metadata.id)
      ) {
        try {
          const extensionPointConfig = makeMenuExtensionPoint(button);
          const packageId = button.installed
            ? editable.find((x) => x.name === extensionPointConfig.metadata.id)
                ?.id
            : null;
          await axios({
            ...(await makeRequestConfig(packageId)),
            data: {
              config: safeDump(extensionPointConfig),
              kind: "extensionPoint",
            },
          } as AxiosRequestConfig);
        } catch (ex) {
          const err = ex as AxiosError;
          const msg =
            err.response.data["config"]?.toString() ?? err.response.statusText;
          setStatus(`Error saving foundation: ${msg}`);
          addToast(`Error saving foundation definition: ${msg}`, {
            appearance: "error",
            autoDismiss: true,
          });
          setSubmitting(false);
          return;
        }
      }

      try {
        dispatch(saveExtension(makeActionExtension(button)));
        dispatch(markSaved(button.uuid));
        addToast("Saved extension", {
          appearance: "success",
          autoDismiss: true,
        });
      } catch (exc) {
        reportError(exc);
        addToast(`Error saving extension: ${exc.toString()}`, {
          appearance: "success",
          autoDismiss: true,
        });
        return;
      } finally {
        setSubmitting(false);
      }

      await Promise.all([
        blockRegistry.fetch(),
        extensionPointRegistry.fetch(),
      ]);
    },
    [dispatch, addToast]
  );
}
