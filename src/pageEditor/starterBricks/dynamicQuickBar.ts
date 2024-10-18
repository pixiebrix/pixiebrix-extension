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
  cleanIsAvailable,
  modComponentWithNormalizedPipeline,
  getImplicitReader,
  lookupStarterBrick,
  makeInitialBaseState,
  removeEmptyValues,
  selectStarterBrickAvailability,
  ALL_SITES_AVAILABILITY,
} from "@/pageEditor/starterBricks/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { faPlusSquare } from "@fortawesome/free-solid-svg-icons";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import type { DraftModComponent } from "@/contentScript/pageEditor/types";
import { type DynamicQuickBarFormState } from "./formStateTypes";
import { DynamicQuickBarStarterBrickABC } from "@/starterBricks/dynamicQuickBar/dynamicQuickBarStarterBrick";
import DynamicQuickBarConfiguration from "@/pageEditor/tabs/dynamicQuickBar/DynamicQuickBarConfiguration";
import { type SingleLayerReaderConfig } from "@/pageEditor/store/editor/baseFormStateTypes";
import {
  type DynamicQuickBarDefinition,
  type DynamicQuickBarConfig,
} from "@/starterBricks/dynamicQuickBar/dynamicQuickBarTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { FeatureFlags } from "@/auth/featureFlags";

function fromNativeElement({
  modMetadata,
  starterBrickMetadata,
}: {
  modMetadata: ModMetadata;
  starterBrickMetadata: Metadata;
}): DynamicQuickBarFormState {
  const base = makeInitialBaseState({ modMetadata });

  const isAvailable = ALL_SITES_AVAILABILITY;

  const title = "Dynamic Quick Bar";

  return {
    // To simplify the interface, this is kept in sync with the caption
    label: title,
    ...base,
    starterBrick: {
      metadata: starterBrickMetadata,
      definition: {
        type: StarterBrickTypes.DYNAMIC_QUICK_BAR,
        reader: getImplicitReader(StarterBrickTypes.DYNAMIC_QUICK_BAR),
        documentUrlPatterns: isAvailable.matchPatterns,
        defaultOptions: {},
        isAvailable,
      },
    },
    modComponent: {
      rootAction: undefined,
      brickPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: DynamicQuickBarFormState,
): StarterBrickDefinitionLike<DynamicQuickBarDefinition> {
  const { starterBrick } = formState;
  const {
    definition: { isAvailable, documentUrlPatterns, reader },
  } = starterBrick;
  return removeEmptyValues({
    ...baseSelectStarterBrick(formState),
    definition: {
      type: StarterBrickTypes.DYNAMIC_QUICK_BAR,
      documentUrlPatterns,
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
    },
  });
}

function selectModComponent(
  state: DynamicQuickBarFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<DynamicQuickBarConfig> {
  const { modComponent } = state;
  const config: DynamicQuickBarConfig = {
    rootAction: modComponent.rootAction,
    generator: options.includeInstanceIds
      ? modComponent.brickPipeline
      : omitEditorMetadata(modComponent.brickPipeline),
  };
  return removeEmptyValues({
    ...baseSelectModComponent(state),
    config,
  });
}

async function fromModComponent(
  config: ModComponentBase<DynamicQuickBarConfig>,
): Promise<DynamicQuickBarFormState> {
  const starterBrick = await lookupStarterBrick<
    DynamicQuickBarDefinition,
    DynamicQuickBarConfig,
    typeof StarterBrickTypes.DYNAMIC_QUICK_BAR
  >(config, StarterBrickTypes.DYNAMIC_QUICK_BAR);

  const {
    documentUrlPatterns = [],
    defaultOptions = {},
    reader,
  } = starterBrick.definition;

  const base = baseFromModComponent(config, starterBrick.definition.type);
  const modComponent = await modComponentWithNormalizedPipeline(
    config.config,
    "generator",
  );

  assertNotNullish(starterBrick.metadata, "Starter brick metadata is required");

  return {
    ...base,
    modComponent,
    starterBrick: {
      metadata: starterBrick.metadata,
      definition: {
        type: StarterBrickTypes.DYNAMIC_QUICK_BAR,
        documentUrlPatterns,
        defaultOptions,
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectStarterBrickAvailability(starterBrick),
      },
    },
  };
}

function asDraftModComponent(
  dynamicQuickBarFormState: DynamicQuickBarFormState,
): DraftModComponent {
  return {
    type: StarterBrickTypes.DYNAMIC_QUICK_BAR,
    extension: selectModComponent(dynamicQuickBarFormState, {
      includeInstanceIds: true,
    }),
    extensionPointConfig: selectStarterBrickDefinition(
      dynamicQuickBarFormState,
    ),
  };
}

const config: ModComponentFormStateAdapter<
  undefined,
  DynamicQuickBarFormState
> = {
  displayOrder: 1,
  starterBrickType: StarterBrickTypes.DYNAMIC_QUICK_BAR,
  label: "Dynamic Quick Bar",
  baseClass: DynamicQuickBarStarterBrickABC,
  StarterBrickConfiguration: DynamicQuickBarConfiguration,
  selectNativeElement: undefined,
  icon: faPlusSquare,
  flag: FeatureFlags.PAGE_EDITOR_DYNAMIC_QUICKBAR,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectModComponent,
  fromModComponent,
};

export default config;
