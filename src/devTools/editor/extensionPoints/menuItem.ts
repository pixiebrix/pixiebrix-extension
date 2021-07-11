/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { IExtension, Metadata } from "@/core";
import {
  ButtonDefinition,
  ButtonSelectionResult,
} from "@/nativeEditor/insertButton";
import { FrameworkMeta } from "@/messaging/constants";
import { ActionFormState } from "@/devTools/editor/editorSlice";
import {
  makeBaseState,
  makeExtensionReaders,
  makeIsAvailable,
  makeReaderFormState,
  WizardStep,
  selectIsAvailable,
  lookupExtensionPoint,
} from "@/devTools/editor/extensionPoints/base";
import {
  MenuDefinition,
  MenuItemExtensionConfig,
} from "@/extensionPoints/menuItemExtension";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray, identity, pickBy } from "lodash";
import FoundationTab from "@/devTools/editor/tabs/menuItem/FoundationTab";
import MenuItemTab from "@/devTools/editor/tabs/menuItem/MenuItemTab";
import ReaderTab from "@/devTools/editor/tabs/reader/ReaderTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";
import MetaTab from "@/devTools/editor/tabs/MetaTab";
import { v4 as uuidv4 } from "uuid";
import { getDomain } from "@/permissions/patterns";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import * as nativeOperations from "@/background/devtools";
import { ElementConfig } from "@/devTools/editor/extensionPoints/elementConfig";

export const wizard: WizardStep[] = [
  { step: "Name", Component: MetaTab },
  { step: "Foundation", Component: FoundationTab },
  { step: "Data", Component: ReaderTab },
  { step: "Menu Item", Component: MenuItemTab },
  { step: "Integrations", Component: ServicesTab },
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
    label: `My ${getDomain(url)} button`,
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
      dynamicCaption: false,
      action: [],
    },
  };
}

export function makeMenuExtensionPoint({
  extensionPoint,
  readers,
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
      description: "Button created with the Page Editor",
    },
    definition: {
      type: "menuItem",
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
      containerSelector: containerSelector,
      position,
      template,
    },
  };
}

export function makeActionExtension({
  uuid,
  label,
  extensionPoint,
  extension,
  services,
}: ActionFormState): IExtension<MenuItemExtensionConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    label,
    services,
    config: extension,
  };
}

export async function makeActionExtensionFormState(
  url: string,
  extensionPoint: ExtensionPointConfig<MenuDefinition>
): Promise<ActionFormState> {
  if (extensionPoint.definition.type !== "menuItem") {
    throw new Error("Expected menuItem extension point type");
  }

  return {
    uuid: uuidv4(),
    installed: true,
    type: extensionPoint.definition.type,
    label: `My ${getDomain(url)} button`,

    readers: await makeReaderFormState(extensionPoint),
    services: [],

    extension: {
      caption:
        extensionPoint.definition.defaultOptions.caption ?? "Custom Action",
      action: [],
    },

    containerInfo: null,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      traits: {
        // we don't provide a way to set style anywhere yet so this doesn't apply yet
        style: { mode: "inherit" },
      },
      definition: {
        ...extensionPoint.definition,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

export async function makeActionFormState(
  config: IExtension<MenuItemExtensionConfig>
): Promise<ActionFormState> {
  const extensionPoint = await lookupExtensionPoint<
    MenuDefinition,
    MenuItemExtensionConfig,
    "menuItem"
  >(config, "menuItem");

  return {
    uuid: config.id,
    installed: true,
    type: extensionPoint.definition.type,
    label: config.label,

    readers: await makeReaderFormState(extensionPoint),
    services: config.services,

    extension: {
      ...config.config,
      action: castArray(config.config.action),
    },

    containerInfo: null,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

function asDynamicElement(element: ActionFormState): ButtonDefinition {
  return {
    type: "menuItem",
    extension: makeActionExtension(element),
    extensionPoint: makeMenuExtensionPoint(element),
    readers: makeExtensionReaders(element),
  };
}

const config: ElementConfig<ButtonSelectionResult, ActionFormState> = {
  elementType: "menuItem",
  label: "Button",
  icon: faMousePointer,
  insert: nativeOperations.insertButton,
  makeState: makeActionState,
  asDynamicElement,
  extensionPoint: makeMenuExtensionPoint,
  extension: makeActionExtension,
  formState: makeActionFormState,
};

export default config;
