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
  baseFromModComponent,
  baseSelectModComponent,
  baseSelectStarterBrick,
  modComponentWithNormalizedPipeline,
  getImplicitReader,
  lookupStarterBrick,
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
import { StarterBrickTypes } from "@/types/starterBrickTypes";

function fromNativeElement(
  url: string,
  metadata: Metadata,
  button: ButtonSelectionResult,
): ActionFormState {
  return {
    type: StarterBrickTypes.BUTTON,
    label: `My ${getDomain(url)} button`,
    ...makeInitialBaseState(button.uuid),
    containerInfo: button.containerInfo,
    extensionPoint: {
      metadata,
      definition: {
        ...button.menu,
        type: StarterBrickTypes.BUTTON,
        reader: getImplicitReader(StarterBrickTypes.BUTTON),
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
  const { extensionPoint: starterBrick } = formState;
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
  } = starterBrick;
  return removeEmptyValues({
    ...baseSelectStarterBrick(formState),
    definition: {
      type: StarterBrickTypes.BUTTON,
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

function selectModComponent(
  state: ActionFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<ButtonStarterBrickConfig> {
  const { extension: modComponent } = state;
  const config: ButtonStarterBrickConfig = {
    caption: modComponent.caption,
    icon: modComponent.icon,
    action: options.includeInstanceIds
      ? modComponent.blockPipeline
      : omitEditorMetadata(modComponent.blockPipeline),
    dynamicCaption: modComponent.dynamicCaption,
    onSuccess: modComponent.onSuccess,
    synchronous: modComponent.synchronous,
  };
  return removeEmptyValues({
    ...baseSelectModComponent(state),
    config,
  });
}

async function fromModComponent(
  config: ModComponentBase<ButtonStarterBrickConfig>,
): Promise<ActionFormState> {
  const starterBrick = await lookupStarterBrick<
    ButtonDefinition,
    ButtonStarterBrickConfig,
    typeof StarterBrickTypes.BUTTON
  >(config, StarterBrickTypes.BUTTON);

  const base = baseFromModComponent(config, starterBrick.definition.type);
  const modComponent = await modComponentWithNormalizedPipeline(
    config.config,
    "action",
  );

  assertNotNullish(starterBrick.metadata, "Starter brick metadata is required");

  return {
    ...base,
    extension: modComponent,
    // `containerInfo` only populated on initial creation session
    containerInfo: null,
    extensionPoint: {
      metadata: starterBrick.metadata,
      definition: {
        ...starterBrick.definition,
        reader: readerTypeHack(starterBrick.definition.reader),
        isAvailable: selectStarterBrickAvailability(starterBrick),
      },
    },
  };
}

function asDraftModComponent(
  actionFormState: ActionFormState,
): DraftButtonModComponent {
  return {
    type: StarterBrickTypes.BUTTON,
    extension: selectModComponent(actionFormState, {
      includeInstanceIds: true,
    }),
    extensionPointConfig: selectStarterBrickDefinition(actionFormState),
  };
}

const config: ModComponentFormStateAdapter<
  ButtonSelectionResult,
  ActionFormState
> = {
  displayOrder: 0,
  elementType: StarterBrickTypes.BUTTON,
  label: "Button",
  icon: faMousePointer,
  baseClass: ButtonStarterBrickABC,
  EditorNode: MenuItemConfiguration,
  selectNativeElement: insertButton,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectModComponent,
  fromModComponent,
};

export default config;
