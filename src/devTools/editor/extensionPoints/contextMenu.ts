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
  getDomain,
  makeBaseState,
  makeExtensionReader,
  makeIsAvailable,
  WizardStep,
} from "@/devTools/editor/extensionPoints/base";
import { v4 as uuidv4 } from "uuid";
import { DynamicDefinition } from "@/nativeEditor";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { identity, pickBy } from "lodash";
import ReaderTab from "@/devTools/editor/tabs/ReaderTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";
import MetaTab from "@/devTools/editor/tabs/MetaTab";
import {
  ContextMenuConfig,
  MenuDefinition,
} from "@/extensionPoints/contextMenu";
import FoundationTab from "@/devTools/editor/tabs/contextMenu/FoundationTab";
import MenuItemTab from "@/devTools/editor/tabs/contextMenu/MenuItemTab";

export const wizard: WizardStep[] = [
  { step: "Name", Component: MetaTab },
  { step: "Foundation", Component: FoundationTab },
  { step: "Menu Item", Component: MenuItemTab },
  { step: "Reader", Component: ReaderTab },
  { step: "Services", Component: ServicesTab },
  { step: "Effect", Component: EffectTab },
  { step: "Availability", Component: AvailabilityTab },
  { step: "Logs", Component: LogsTab },
];

export function makeContextMenuState(
  url: string,
  metadata: Metadata,
  frameworks: FrameworkMeta[]
): ContextMenuFormState {
  return {
    type: "contextMenu",
    label: `My ${getDomain(url)} menu item`,
    ...makeBaseState(uuidv4(), null, metadata, frameworks),
    extensionPoint: {
      metadata,
      definition: {
        isAvailable: makeIsAvailable(url),
        contexts: ["page"],
      },
    },
    extension: {
      title: "PixieBrix",
      action: [],
    },
  };
}

export function makeContextMenuExtensionPoint({
  extensionPoint,
  reader,
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
      reader: reader.metadata.id,
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
    config: {
      ...extension,
      contexts: extensionPoint.definition.contexts,
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
    reader: makeExtensionReader(element),
  };
}
