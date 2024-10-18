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
import {
  type ModComponentBase,
  type ModMetadata,
} from "@/types/modComponentTypes";
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
import ButtonConfiguration from "@/pageEditor/tabs/button/ButtonConfiguration";
import { insertButton } from "@/contentScript/messenger/api";
import {
  type DraftButtonModComponent,
  type ButtonSelectionResult,
} from "@/contentScript/pageEditor/types";
import { type ButtonFormState } from "./formStateTypes";
import {
  type ButtonDefinition,
  type ButtonStarterBrickConfig,
} from "@/starterBricks/button/buttonStarterBrickTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

function fromNativeElement({
  url,
  modMetadata,
  starterBrickMetadata,
  element,
}: {
  url: string;
  modMetadata: ModMetadata;
  starterBrickMetadata: Metadata;
  element: ButtonSelectionResult;
}): ButtonFormState {
  return {
    label: `My ${getDomain(url)} button`,
    ...makeInitialBaseState({
      modComponentId: element.uuid,
      modMetadata,
    }),
    containerInfo: element.containerInfo,
    starterBrick: {
      metadata: starterBrickMetadata,
      definition: {
        ...element.menu,
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
    modComponent: {
      caption: element.item.caption,
      brickPipeline: [],
      dynamicCaption: false,
      onSuccess: true,
      synchronous: false,
    },
  };
}

function selectStarterBrickDefinition(
  formState: ButtonFormState,
): StarterBrickDefinitionLike<ButtonDefinition> {
  const { starterBrick } = formState;
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
  state: ButtonFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<ButtonStarterBrickConfig> {
  const { modComponent } = state;
  const config: ButtonStarterBrickConfig = {
    caption: modComponent.caption,
    icon: modComponent.icon,
    action: options.includeInstanceIds
      ? modComponent.brickPipeline
      : omitEditorMetadata(modComponent.brickPipeline),
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
): Promise<ButtonFormState> {
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
    modComponent,
    // `containerInfo` only populated on initial creation session
    containerInfo: null,
    starterBrick: {
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
  actionFormState: ButtonFormState,
): DraftButtonModComponent {
  return {
    type: StarterBrickTypes.BUTTON,
    modComponent: selectModComponent(actionFormState, {
      includeInstanceIds: true,
    }),
    starterBrickDefinition: selectStarterBrickDefinition(actionFormState),
  };
}

const config: ModComponentFormStateAdapter<
  ButtonSelectionResult,
  ButtonFormState
> = {
  displayOrder: 0,
  starterBrickType: StarterBrickTypes.BUTTON,
  label: "Button",
  icon: faMousePointer,
  baseClass: ButtonStarterBrickABC,
  EditorNode: ButtonConfiguration,
  selectNativeElement: insertButton,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectModComponent,
  fromModComponent,
};

export default config;
