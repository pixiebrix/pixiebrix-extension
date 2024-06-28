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
import { ButtonStarterBrickABC } from "@/starterBricks/button/buttonStarterBrick";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { getDomain } from "@/permissions/patterns";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import MenuItemConfiguration from "@/pageEditor/tabs/menuItem/MenuItemConfiguration";
import { insertButton } from "@/contentScript/messenger/api";
import {
  type DraftButtonModComponent,
  type ButtonSelectionResult,
} from "@/contentScript/pageEditor/types";
import { type ActionFormState } from "./formStateTypes";
import {
  type ButtonDefinition,
  type ButtonStarterBrickConfig,
} from "@/starterBricks/button/buttonStarterBrickTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { StarterBrickKinds } from "@/types/starterBrickTypes";

function fromNativeElement(
  url: string,
  metadata: Metadata,
  button: ButtonSelectionResult,
): ActionFormState {
  return {
    type: StarterBrickKinds.BUTTON,
    label: `My ${getDomain(url)} button`,
    ...makeInitialBaseState(button.uuid),
    containerInfo: button.containerInfo,
    extensionPoint: {
      metadata,
      definition: {
        ...button.menu,
        type: StarterBrickKinds.BUTTON,
        reader: getImplicitReader(StarterBrickKinds.BUTTON),
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
): StarterBrickDefinitionLike<ButtonDefinition> {
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
      type: StarterBrickKinds.BUTTON,
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
): ModComponentBase<ButtonStarterBrickConfig> {
  const { extension } = state;
  const config: ButtonStarterBrickConfig = {
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
  config: ModComponentBase<ButtonStarterBrickConfig>,
): Promise<ActionFormState> {
  const extensionPoint = await lookupExtensionPoint<
    ButtonDefinition,
    ButtonStarterBrickConfig,
    typeof StarterBrickKinds.BUTTON
  >(config, StarterBrickKinds.BUTTON);

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
): DraftButtonModComponent {
  return {
    type: StarterBrickKinds.BUTTON,
    extension: selectExtension(actionFormState, { includeInstanceIds: true }),
    extensionPointConfig: selectStarterBrickDefinition(actionFormState),
  };
}

const config: ModComponentFormStateAdapter<
  ButtonSelectionResult,
  ActionFormState
> = {
  displayOrder: 0,
  elementType: StarterBrickKinds.BUTTON,
  label: "Button",
  icon: faMousePointer,
  baseClass: ButtonStarterBrickABC,
  EditorNode: MenuItemConfiguration,
  selectNativeElement: insertButton,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectExtension,
  fromExtension,
};

export default config;
