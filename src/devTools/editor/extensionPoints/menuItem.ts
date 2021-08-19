/* eslint-disable filenames/match-exported */
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

import { IconConfig, IExtension, Metadata } from "@/core";
import {
  ButtonDefinition,
  ButtonSelectionResult,
} from "@/nativeEditor/insertButton";
import { FrameworkMeta } from "@/messaging/constants";
import {
  makeBaseState,
  makeExtensionReaders,
  makeIsAvailable,
  makeReaderFormState,
  WizardStep,
  selectIsAvailable,
  lookupExtensionPoint,
  baseSelectExtensionPoint,
} from "@/devTools/editor/extensionPoints/base";
import {
  MenuDefinition,
  MenuItemExtensionConfig,
  MenuItemExtensionPoint,
  MenuPosition,
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
import { uuidv4 } from "@/types/helpers";
import { getDomain } from "@/permissions/patterns";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import * as nativeOperations from "@/background/devtools";
import {
  BaseFormState,
  ElementConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { ElementInfo } from "@/nativeEditor/frameworks";
import { BlockPipeline } from "@/blocks/combinators";

const wizard: WizardStep[] = [
  { step: "Name", Component: MetaTab },
  { step: "Foundation", Component: FoundationTab },
  { step: "Data", Component: ReaderTab },
  { step: "Menu Item", Component: MenuItemTab },
  { step: "Integrations", Component: ServicesTab },
  { step: "Effect", Component: EffectTab },
  { step: "Availability", Component: AvailabilityTab },
  { step: "Logs", Component: LogsTab },
];

export interface ActionFormState extends BaseFormState {
  type: "menuItem";

  containerInfo: ElementInfo;

  extensionPoint: {
    metadata: Metadata;
    definition: {
      containerSelector: string;
      position?: MenuPosition;
      template: string;
      isAvailable: {
        matchPatterns: string;
        selectors: string;
      };
    };
    traits?: {
      style: {
        mode: "default" | "inherit";
      };
    };
  };

  extension: {
    caption: string;
    dynamicCaption?: boolean;
    icon?: IconConfig;
    action: BlockPipeline;
  };
}

function fromNativeElement(
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

function selectExtensionPoint(
  formState: ActionFormState
): ExtensionPointConfig<MenuDefinition> {
  const { extensionPoint, readers } = formState;
  const {
    definition: { isAvailable, position, template, containerSelector },
  } = extensionPoint;
  return {
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "menuItem",
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
      containerSelector,
      position,
      template,
    },
  };
}

function selectExtension({
  uuid,
  label,
  extensionPoint,
  extension,
  services,
}: ActionFormState): IExtension<MenuItemExtensionConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    _recipe: null,
    label,
    services,
    config: extension,
  };
}

async function fromExtensionPoint(
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
        extensionPoint.definition.defaultOptions?.caption ?? "Custom Action",
      action: [],
    },

    // There's no containerInfo for the page because the user did not select it during the session
    containerInfo: null,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      traits: {
        // We don't provide a way to set style anywhere yet so this doesn't apply yet
        style: { mode: "inherit" },
      },
      definition: {
        ...extensionPoint.definition,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

export async function fromExtension(
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
    extension: selectExtension(element),
    extensionPoint: selectExtensionPoint(element),
    readers: makeExtensionReaders(element),
  };
}

const config: ElementConfig<ButtonSelectionResult, ActionFormState> = {
  displayOrder: 0,
  elementType: "menuItem",
  label: "Button",
  icon: faMousePointer,
  baseClass: MenuItemExtensionPoint,
  selectNativeElement: nativeOperations.insertButton,
  wizard,
  fromExtensionPoint,
  fromNativeElement,
  asDynamicElement,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
};

export default config;
