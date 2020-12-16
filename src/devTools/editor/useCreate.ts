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

import { FormState } from "@/devTools/editor/editorSlice";
import { identity, pickBy } from "lodash";
import { useDispatch } from "react-redux";
import { useCallback, useState } from "react";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { makeURL } from "@/hooks/fetch";
import { safeDump } from "js-yaml";
import { getExtensionToken } from "@/auth/token";
import { optionsSlice } from "@/options/slices";
import { FormikHelpers } from "formik";
import { useToasts } from "react-toast-notifications";
import { reportError } from "@/telemetry/logging";
import { defaultConfig, readerOptions } from "@/devTools/editor/ReaderTab";
import blockRegistry from "@/blocks/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import { ReaderConfig, ReaderDefinition } from "@/blocks/readers/factory";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import {
  MenuDefinition,
  MenuItemExtensionConfig,
} from "@/extensionPoints/menuItemExtension";
import { IExtension, ServiceDependency } from "@/core";
import { ButtonDefinition } from "@/nativeEditor/insertButton";

const { saveExtension } = optionsSlice.actions;

export function makeMenuReader({
  reader,
}: FormState): ReaderConfig<ReaderDefinition> {
  const { metadata, definition, outputSchema = {} } = reader;

  const readerOption = readerOptions.find((x) => x.value === definition.type);

  return {
    apiVersion: "v1",
    kind: "reader",
    metadata: {
      id: metadata.id,
      name: metadata.name,
      version: "1.0.0",
      description: "Reader created with the devtools",
    },
    definition: {
      reader: (readerOption?.makeConfig ?? defaultConfig)(
        definition.type,
        definition.selector
      ),
    },
    outputSchema,
  };
}

export function makeMenuExtensionPoint({
  extensionPoint,
  reader,
}: FormState): ExtensionPointConfig<MenuDefinition> {
  const {
    metadata,
    definition: { isAvailable, position, template, containerSelector },
  } = extensionPoint;

  return {
    apiVersion: "v1",
    kind: "extensionPoint",
    metadata: {
      id: metadata.id,
      version: "1.0.0",
      name: metadata.name,
      description: "Action created with the devtools",
    },
    definition: {
      type: "menuItem",
      reader: reader.metadata.id,
      isAvailable: pickBy(isAvailable, identity),
      containerSelector: containerSelector,
      position,
      template,
    },
  };
}

export function makeExtensionDefinition({
  uuid,
  extensionPoint,
  extension,
}: FormState): IExtension<MenuItemExtensionConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    label: "Custom Action",
    // services here refers to the service auth
    services: [] as ServiceDependency[],
    config: extension,
  };
}

export function makeButtonConfig(element: FormState): ButtonDefinition {
  return {
    extension: makeExtensionDefinition(element),
    extensionPoint: makeMenuExtensionPoint(element),
    reader: makeMenuReader(element),
  };
}

async function makeRequestConfig(
  saved: { [id: string]: string },
  id: string
): Promise<AxiosRequestConfig> {
  if (saved[id]) {
    return {
      url: await makeURL(`api/bricks/${saved[id]}/`),
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
  button: FormState,
  helpers: FormikHelpers<FormState>
) => Promise<void> {
  const dispatch = useDispatch();
  const [saved, setSaved] = useState<{ [id: string]: string }>({});
  const { addToast } = useToasts();

  return useCallback(
    async (
      button: FormState,
      { setSubmitting, setStatus }: FormikHelpers<FormState>
    ) => {
      try {
        const readerConfig = makeMenuReader(button);
        const { data: readerData } = await axios({
          ...(await makeRequestConfig(saved, readerConfig.metadata.id)),
          data: { config: safeDump(readerConfig), kind: "reader" },
        } as AxiosRequestConfig);
        setSaved((x) => ({ ...x, [readerConfig.metadata.id]: readerData.id }));
      } catch (ex) {
        const err = ex as AxiosError;
        const msg =
          err.response.data["config"]?.toString() ?? err.response.statusText;
        setStatus(msg);
        addToast(`Error saving reader definition: ${msg}`, {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
        return;
      }

      try {
        const extensionPointConfig = makeMenuExtensionPoint(button);
        const { data: extensionPointData } = await axios({
          ...(await makeRequestConfig(saved, extensionPointConfig.metadata.id)),
          data: {
            config: safeDump(extensionPointConfig),
            kind: "extensionPoint",
          },
        } as AxiosRequestConfig);
        setSaved((x) => ({
          ...x,
          [extensionPointConfig.metadata.id]: extensionPointData.id,
        }));
      } catch (ex) {
        const err = ex as AxiosError;
        const msg =
          err.response.data["config"]?.toString() ?? err.response.statusText;
        setStatus(msg);
        addToast(`Error saving foundation definition: ${msg}`, {
          appearance: "error",
          autoDismiss: true,
        });
        setSubmitting(false);
        return;
      }

      try {
        dispatch(saveExtension(makeExtensionDefinition(button)));
        addToast("Saved button definition", {
          appearance: "success",
          autoDismiss: true,
        });
      } catch (exc) {
        reportError(exc);
        addToast(`Error saving button definition: ${exc.toString()}`, {
          appearance: "success",
          autoDismiss: true,
        });
      } finally {
        setSubmitting(false);
      }

      await Promise.all([
        blockRegistry.fetch(),
        extensionPointRegistry.fetch(),
      ]);
    },
    [dispatch, addToast, saved]
  );
}
