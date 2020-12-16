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

import { IExtension, Metadata } from "@/core";
import {
  ButtonDefinition,
  ButtonSelectionResult,
} from "@/nativeEditor/insertButton";
import { FrameworkMeta } from "@/messaging/constants";
import { ActionFormState } from "@/devTools/editor/editorSlice";
import {
  makeBaseState,
  makeExtensionReader,
  makeIsAvailable,
} from "@/devTools/editor/extensionPoints/base";
import {
  MenuDefinition,
  MenuItemExtensionConfig,
} from "@/extensionPoints/menuItemExtension";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { identity, pickBy } from "lodash";
import FoundationTab from "@/devTools/editor/tabs/menuItem/FoundationTab";
import MenuItemTab from "@/devTools/editor/tabs/menuItem/MenuItemTab";
import ReaderTab from "@/devTools/editor/tabs/ReaderTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";

export const wizard = [
  { step: "Foundation", Component: FoundationTab },
  { step: "Reader", Component: ReaderTab },
  { step: "Menu Item", Component: MenuItemTab },
  { step: "Services", Component: ServicesTab },
  { step: "Effect", Component: EffectTab },
  { step: "Availability", Component: AvailabilityTab },
  { step: "Logs", Component: LogsTab },
];

export function makeActionState(
  url: string,
  metadata: Metadata,
  button: ButtonSelectionResult,
  frameworks: FrameworkMeta[]
): ActionFormState {
  return {
    type: "menuItem",
    ...makeBaseState(
      button.uuid,
      button.menu.containerSelector,
      metadata,
      frameworks
    ),
    containerInfo: button.containerInfo,
    extensionPoint: {
      metadata,
      definition: {
        ...button.menu,
        isAvailable: makeIsAvailable(url),
      },
      traits: {
        style: {
          mode: "inherit",
        },
      },
    },
    extension: {
      caption: button.item.caption,
      action: [],
    },
  };
}

export function makeMenuExtensionPoint({
  extensionPoint,
  reader,
}: ActionFormState): ExtensionPointConfig<MenuDefinition> {
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

export function makeActionExtension({
  uuid,
  extensionPoint,
  extension,
  services,
}: ActionFormState): IExtension<MenuItemExtensionConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    label: "Custom Action",
    services,
    config: extension,
  };
}

export function makeActionConfig(element: ActionFormState): ButtonDefinition {
  return {
    extension: makeActionExtension(element),
    extensionPoint: makeMenuExtensionPoint(element),
    reader: makeExtensionReader(element),
  };
}
