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

import { IExtension, Metadata } from "@/core";
import {
  baseFromExtension,
  baseSelectExtension,
  baseSelectExtensionPoint,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  extensionWithNormalizedPipeline,
  omitEditorMetadata,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  readerTypeHack,
  removeEmptyValues,
  selectIsAvailable,
} from "@/devTools/editor/extensionPoints/base";
import {
  MenuDefinition,
  MenuItemExtensionConfig,
  MenuItemExtensionPoint,
  MenuPosition,
} from "@/extensionPoints/menuItemExtension";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { identity, pickBy } from "lodash";
import { uuidv4 } from "@/types/helpers";
import { getDomain } from "@/permissions/patterns";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import {
  BaseExtensionState,
  BaseFormState,
  ElementConfig,
  SingleLayerReaderConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { NormalizedAvailability } from "@/blocks/types";
import MenuItemConfiguration from "@/devTools/editor/tabs/menuItem/MenuItemConfiguration";
import { insertButton } from "@/contentScript/messenger/api";
import { Except } from "type-fest";
import {
  ButtonDefinition,
  ButtonSelectionResult,
  ElementInfo,
} from "@/contentScript/nativeEditor/types";

type Extension = BaseExtensionState & Except<MenuItemExtensionConfig, "action">;

export interface ActionFormState extends BaseFormState<Extension> {
  type: "menuItem";

  containerInfo: ElementInfo;

  extensionPoint: {
    metadata: Metadata;
    definition: {
      containerSelector: string;
      position?: MenuPosition;
      template: string;
      reader: SingleLayerReaderConfig;
      isAvailable: NormalizedAvailability;
    };
    traits?: {
      style: {
        mode: "default" | "inherit";
      };
    };
  };
}

function fromNativeElement(
  url: string,
  metadata: Metadata,
  button: ButtonSelectionResult
): ActionFormState {
  return {
    type: "menuItem",
    label: `My ${getDomain(url)} button`,
    ...makeInitialBaseState(button.uuid),
    containerInfo: button.containerInfo,
    extensionPoint: {
      metadata,
      definition: {
        ...button.menu,
        reader: getImplicitReader("menuItem"),
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
      blockPipeline: [],
      dynamicCaption: false,
    },
  };
}

function selectExtensionPoint(
  formState: ActionFormState
): ExtensionPointConfig<MenuDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: { isAvailable, position, template, reader, containerSelector },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "menuItem",
      reader,
      isAvailable: pickBy(isAvailable, identity),
      containerSelector,
      position,
      template,
    },
  });
}

function selectExtension(
  state: ActionFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<MenuItemExtensionConfig> {
  const { extension } = state;
  const config: MenuItemExtensionConfig = {
    caption: extension.caption,
    icon: extension.icon,
    action: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
    dynamicCaption: extension.dynamicCaption,
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
  });
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
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    installed: true,
    type: extensionPoint.definition.type,
    label: `My ${getDomain(url)} button`,

    services: [],

    optionsArgs: {},

    extension: {
      caption:
        extensionPoint.definition.defaultOptions?.caption ?? "Custom Action",
      blockPipeline: [],
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
        reader: readerTypeHack(extensionPoint.definition.reader),
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
    recipe: undefined,
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

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = extensionWithNormalizedPipeline(config.config, "action");

  return {
    ...base,

    extension,

    // `containerInfo` only populated on initial creation session
    containerInfo: null,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        reader: readerTypeHack(extensionPoint.definition.reader),
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

function asDynamicElement(element: ActionFormState): ButtonDefinition {
  return {
    type: "menuItem",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPoint: selectExtensionPoint(element),
  };
}

const config: ElementConfig<ButtonSelectionResult, ActionFormState> = {
  displayOrder: 0,
  elementType: "menuItem",
  label: "Button",
  icon: faMousePointer,
  baseClass: MenuItemExtensionPoint,
  EditorNode: MenuItemConfiguration,
  selectNativeElement: insertButton,
  fromExtensionPoint,
  fromNativeElement,
  asDynamicElement,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
};

export default config;
