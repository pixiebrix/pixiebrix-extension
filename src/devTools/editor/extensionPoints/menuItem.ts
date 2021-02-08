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
  getDomain,
  makeBaseState,
  makeExtensionReaders,
  makeIsAvailable,
  makeReaderFormState,
  WizardStep,
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
import { find as findBrick } from "@/registry/localRegistry";

export const wizard: WizardStep[] = [
  { step: "Name", Component: MetaTab },
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

export function makeActionConfig(element: ActionFormState): ButtonDefinition {
  return {
    type: "menuItem",
    extension: makeActionExtension(element),
    extensionPoint: makeMenuExtensionPoint(element),
    readers: makeExtensionReaders(element),
  };
}

export async function makeActionFormState(
  config: IExtension<MenuItemExtensionConfig>
): Promise<ActionFormState> {
  const extensionPoint = ((await findBrick(config.extensionPointId))
    .config as unknown) as ExtensionPointConfig<MenuDefinition>;

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
        isAvailable: {
          matchPatterns: matchPatterns[0],
          selectors: selectors[0],
        },
      },
    },
  };
}
