/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import { IExtension, Metadata } from "@/core";
import { FrameworkMeta } from "@/messaging/constants";
import { ContextMenuFormState } from "@/devTools/editor/editorSlice";
import {
  makeBaseState,
  makeExtensionReaders,
  makeIsAvailable,
  makeReaderFormState,
  WizardStep,
} from "@/devTools/editor/extensionPoints/base";
import { v4 as uuidv4 } from "uuid";
import { DynamicDefinition } from "@/nativeEditor";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray, identity, pickBy } from "lodash";
import ReaderTab from "@/devTools/editor/tabs/reader/ReaderTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import {
  ContextMenuConfig,
  MenuDefinition,
} from "@/extensionPoints/contextMenu";
import MenuItemTab from "@/devTools/editor/tabs/contextMenu/MenuItemTab";
import { find as findBrick } from "@/registry/localRegistry";
import AvailabilityTab from "@/devTools/editor/tabs/contextMenu/AvailabilityTab";

export const wizard: WizardStep[] = [
  { step: "Menu Item", Component: MenuItemTab },
  // { step: "Name", Component: MetaTab },
  // { step: "Foundation", Component: FoundationTab },
  { step: "Location", Component: AvailabilityTab },
  { step: "Data", Component: ReaderTab },
  { step: "Integrations", Component: ServicesTab },
  { step: "Action", Component: EffectTab },
  { step: "Logs", Component: LogsTab },
];

export function makeContextMenuState(
  url: string,
  metadata: Metadata,
  frameworks: FrameworkMeta[]
): ContextMenuFormState {
  const base = makeBaseState(uuidv4(), null, metadata, frameworks);
  // don't include a reader since in most cases can't use a selection reader
  base.readers = [];

  const isAvailable = makeIsAvailable(url);

  const title = "Context menu item";

  return {
    type: "contextMenu",
    // to simplify the interface, this is kept in sync with the caption
    label: title,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        documentUrlPatterns: [isAvailable.matchPatterns],
        contexts: ["all"],
        defaultOptions: {},
        isAvailable,
      },
    },
    extension: {
      title,
      action: [],
    },
  };
}

export function makeContextMenuExtensionPoint({
  extensionPoint,
  readers,
}: ContextMenuFormState): ExtensionPointConfig<MenuDefinition> {
  const {
    metadata,
    definition: { isAvailable },
  } = extensionPoint;

  return {
    apiVersion: "v1",
    kind: "extensionPoint",
    metadata: {
      id: metadata.id,
      version: "1.0.0",
      name: metadata.name,
      description: "Context Menu created with the Page Editor",
    },
    definition: {
      type: "contextMenu",
      documentUrlPatterns: extensionPoint.definition.documentUrlPatterns,
      contexts: ["all"],
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
    },
  };
}

export function makeContextMenuExtension({
  uuid,
  label,
  extensionPoint,
  extension,
  services,
}: ContextMenuFormState): IExtension<ContextMenuConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    label,
    services,
    config: extension,
  };
}

export async function makeContextMenuFormState(
  config: IExtension<ContextMenuConfig>
): Promise<ContextMenuFormState> {
  const brick = await findBrick(config.extensionPointId);
  if (!brick) {
    throw new Error(
      `Cannot find extension point definition: ${config.extensionPointId}`
    );
  }
  const extensionPoint = (brick.config as unknown) as ExtensionPointConfig<MenuDefinition>;

  const isAvailable = extensionPoint.definition.isAvailable;
  const matchPatterns = castArray(isAvailable.matchPatterns ?? []);
  const selectors = castArray(isAvailable.selectors ?? []);

  if (matchPatterns.length > 1) {
    throw new Error(
      "Editing extension point with multiple availability match patterns not implemented"
    );
  }

  if (selectors.length > 1) {
    throw new Error(
      "Editing extension point with multiple availability selectors not implemented"
    );
  }

  const extensionConfig = config.config;

  return {
    uuid: config.id,
    installed: true,
    type: extensionPoint.definition.type,
    label: config.label,

    readers: await makeReaderFormState(extensionPoint),
    services: config.services,

    extension: {
      ...extensionConfig,
      action: castArray(extensionConfig.action),
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        documentUrlPatterns: extensionPoint.definition.documentUrlPatterns,
        defaultOptions: extensionPoint.definition.defaultOptions,
        contexts: extensionPoint.definition.contexts,
        isAvailable: {
          matchPatterns: matchPatterns[0],
          selectors: selectors[0],
        },
      },
    },
  };
}

export function makeContextMenuConfig(
  element: ContextMenuFormState
): DynamicDefinition {
  return {
    type: "contextMenu",
    extension: makeContextMenuExtension(element),
    extensionPoint: makeContextMenuExtensionPoint(element),
    readers: makeExtensionReaders(element),
  };
}
