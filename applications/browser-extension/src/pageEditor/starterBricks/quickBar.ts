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

import { type Metadata } from "../../types/registryTypes";
import {
  type ModComponentBase,
  type ModMetadata,
} from "../../types/modComponentTypes";
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
} from "./base";
import { omitEditorMetadata } from "./pipelineMapping";
import { type StarterBrickDefinitionLike } from "../../starterBricks/types";
import { faThLarge } from "@fortawesome/free-solid-svg-icons";
import { type ModComponentFormStateAdapter } from "./modComponentFormStateAdapter";
import { QuickBarStarterBrickABC } from "../../starterBricks/quickBar/quickBarStarterBrick";
import QuickBarConfiguration from "../tabs/quickBar/QuickBarConfiguration";
import type { DraftModComponent } from "@/contentScript/pageEditor/types";
import { type QuickBarFormState } from "./formStateTypes";
import { type SingleLayerReaderConfig } from "../store/editor/baseFormStateTypes";
import {
  type QuickBarDefinition,
  type QuickBarConfig,
} from "../../starterBricks/quickBar/quickBarTypes";
import { assertNotNullish } from "../../utils/nullishUtils";
import { StarterBrickTypes } from "../../types/starterBrickTypes";

import { type DraftModState } from "../store/editor/pageEditorTypes";

function fromNativeElement({
  modMetadata,
  starterBrickMetadata,
}: {
  modMetadata: ModMetadata;
  starterBrickMetadata: Metadata;
}): QuickBarFormState {
  const base = makeInitialBaseState({ modMetadata });

  const isAvailable = ALL_SITES_AVAILABILITY;

  const title = "Quick Bar item";

  return {
    // To simplify the interface, this is kept in sync with the caption
    label: title,
    ...base,
    starterBrick: {
      metadata: starterBrickMetadata,
      definition: {
        type: StarterBrickTypes.QUICK_BAR_ACTION,
        reader: getImplicitReader(StarterBrickTypes.QUICK_BAR_ACTION),
        documentUrlPatterns: isAvailable.matchPatterns,
        contexts: ["all"],
        targetMode: "eventTarget",
        defaultOptions: {},
        isAvailable,
      },
    },
    modComponent: {
      title,
      brickPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: QuickBarFormState,
): StarterBrickDefinitionLike<QuickBarDefinition> {
  const { starterBrick } = formState;
  const {
    definition: {
      isAvailable,
      documentUrlPatterns,
      reader,
      targetMode,
      contexts = ["all"],
    },
  } = starterBrick;
  return removeEmptyValues({
    ...baseSelectStarterBrick(formState),
    definition: {
      type: StarterBrickTypes.QUICK_BAR_ACTION,
      documentUrlPatterns,
      contexts,
      targetMode,
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
    },
  });
}

function selectModComponent(
  formState: QuickBarFormState,
  modState: DraftModState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<QuickBarConfig> {
  const { modComponent } = formState;
  const config: QuickBarConfig = {
    title: modComponent.title,
    icon: modComponent.icon,
    action: options.includeInstanceIds
      ? modComponent.brickPipeline
      : omitEditorMetadata(modComponent.brickPipeline),
  };
  return removeEmptyValues({
    ...baseSelectModComponent(formState, modState),
    config,
  });
}

async function fromModComponent(
  config: ModComponentBase<QuickBarConfig>,
): Promise<QuickBarFormState> {
  const starterBrick = await lookupStarterBrick<
    QuickBarDefinition,
    QuickBarConfig,
    typeof StarterBrickTypes.QUICK_BAR_ACTION
  >(config, StarterBrickTypes.QUICK_BAR_ACTION);

  const {
    documentUrlPatterns = [],
    defaultOptions = {},
    contexts,
    targetMode,
    reader,
  } = starterBrick.definition;

  const base = baseFromModComponent(config, starterBrick.definition.type);
  const modComponent = await modComponentWithNormalizedPipeline(
    config.config,
    "action",
  );

  assertNotNullish(starterBrick.metadata, "Starter brick metadata is required");

  return {
    ...base,
    modComponent,
    starterBrick: {
      metadata: starterBrick.metadata,
      definition: {
        type: StarterBrickTypes.QUICK_BAR_ACTION,
        documentUrlPatterns,
        defaultOptions,
        targetMode,
        contexts,
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectStarterBrickAvailability(starterBrick),
      },
    },
  };
}

function asDraftModComponent(
  quickBarFormState: QuickBarFormState,
  modState: DraftModState,
): DraftModComponent {
  return {
    type: StarterBrickTypes.QUICK_BAR_ACTION,
    modComponent: selectModComponent(quickBarFormState, modState, {
      includeInstanceIds: true,
    }),
    starterBrickDefinition: selectStarterBrickDefinition(quickBarFormState),
  };
}

const config: ModComponentFormStateAdapter<undefined, QuickBarFormState> = {
  displayOrder: 1,
  starterBrickType: StarterBrickTypes.QUICK_BAR_ACTION,
  label: "Quick Bar Action",
  baseClass: QuickBarStarterBrickABC,
  StarterBrickConfiguration: QuickBarConfiguration,
  selectNativeElement: undefined,
  icon: faThLarge,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectModComponent,
  fromModComponent,
};

export default config;
