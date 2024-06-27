/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { type Metadata } from "@/types/registryTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import {
  baseFromExtension,
  baseSelectExtension,
  baseSelectExtensionPoint,
  extensionWithNormalizedPipeline,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  getDefaultAvailabilityForUrl,
  readerTypeHack,
  removeEmptyValues,
  selectStarterBrickAvailability,
  cleanIsAvailable,
} from "@/pageEditor/starterBricks/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { MenuItemStarterBrickABC } from "@/starterBricks/menuItem/menuItemStarterBrick";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { getDomain } from "@/permissions/patterns";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import MenuItemConfiguration from "@/pageEditor/tabs/menuItem/MenuItemConfiguration";
import { insertButton } from "@/contentScript/messenger/api";
import {
  type ButtonDefinition,
  type ButtonSelectionResult,
} from "@/contentScript/pageEditor/types";
import { type ActionFormState } from "./formStateTypes";
import {
  type MenuItemDefinition,
  type MenuItemStarterBrickConfig,
} from "@/starterBricks/menuItem/menuItemTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

function fromNativeElement(
  url: string,
  metadata: Metadata,
  button: ButtonSelectionResult,
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
        type: "menuItem",
        reader: getImplicitReader("menuItem"),
        isAvailable: getDefaultAvailabilityForUrl(url),
        targetMode: "document",
        attachMode: "once",
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
      onSuccess: true,
      synchronous: false,
    },
  };
}

function selectStarterBrickDefinition(
  formState: ActionFormState,
): StarterBrickDefinitionLike<MenuItemDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: {
      isAvailable,
      position,
      template,
      reader,
      containerSelector,
      targetMode,
      attachMode,
    },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "menuItem",
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
      containerSelector,
      targetMode,
      attachMode,
      position,
      template,
    },
  });
}

function selectExtension(
  state: ActionFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<MenuItemStarterBrickConfig> {
  const { extension } = state;
  const config: MenuItemStarterBrickConfig = {
    caption: extension.caption,
    icon: extension.icon,
    action: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
    dynamicCaption: extension.dynamicCaption,
    onSuccess: extension.onSuccess,
    synchronous: extension.synchronous,
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
  });
}

async function fromExtension(
  config: ModComponentBase<MenuItemStarterBrickConfig>,
): Promise<ActionFormState> {
  const extensionPoint = await lookupExtensionPoint<
    MenuItemDefinition,
    MenuItemStarterBrickConfig,
    "menuItem"
  >(config, "menuItem");

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = await extensionWithNormalizedPipeline(
    config.config,
    "action",
  );

  assertNotNullish(
    extensionPoint.metadata,
    "Starter brick metadata is required",
  );

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
        isAvailable: selectStarterBrickAvailability(extensionPoint),
      },
    },
  };
}

function asDraftModComponent(
  actionFormState: ActionFormState,
): ButtonDefinition {
  return {
    type: "menuItem",
    extension: selectExtension(actionFormState, { includeInstanceIds: true }),
    extensionPointConfig: selectStarterBrickDefinition(actionFormState),
  };
}

const config: ModComponentFormStateAdapter<
  ButtonSelectionResult,
  ActionFormState
> = {
  displayOrder: 0,
  elementType: "menuItem",
  label: "Button",
  icon: faMousePointer,
  baseClass: MenuItemStarterBrickABC,
  EditorNode: MenuItemConfiguration,
  selectNativeElement: insertButton,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectExtension,
  fromExtension,
};

export default config;
