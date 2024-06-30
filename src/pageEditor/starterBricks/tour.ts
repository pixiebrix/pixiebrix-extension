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
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { getDomain } from "@/permissions/patterns";
import { faMapSigns } from "@fortawesome/free-solid-svg-icons";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import type { DraftModComponent } from "@/contentScript/pageEditor/types";
import { type TourFormState } from "./formStateTypes";
import { TourStarterBrickABC } from "@/starterBricks/tour/tourStarterBrick";
import TourConfiguration from "@/pageEditor/tabs/tour/TourConfiguration";
import { type ModComponentBase } from "@/types/modComponentTypes";
import {
  type TourDefinition,
  type TourConfig,
} from "@/starterBricks/tour/tourTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

function fromNativeElement(
  url: string,
  metadata: Metadata,
  _element: null,
): TourFormState {
  return {
    type: "tour",
    label: `My ${getDomain(url)} tour`,
    ...makeInitialBaseState(),
    extensionPoint: {
      metadata,
      definition: {
        type: "tour",
        allowUserRun: true,
        autoRunSchedule: "never",
        reader: getImplicitReader("tour"),
        isAvailable: getDefaultAvailabilityForUrl(url),
      },
    },
    extension: {
      blockPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: TourFormState,
): StarterBrickDefinitionLike<TourDefinition> {
  const { extensionPoint: starterBrick } = formState;
  const {
    definition: { isAvailable, reader },
  } = starterBrick;
  return removeEmptyValues({
    ...baseSelectStarterBrick(formState),
    definition: {
      type: "tour",
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
    },
  });
}

function selectModComponent(
  state: TourFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<TourConfig> {
  const { extension: modComponent } = state;
  const config: TourConfig = {
    tour: options.includeInstanceIds
      ? modComponent.blockPipeline
      : omitEditorMetadata(modComponent.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectModComponent(state),
    config,
  });
}

function asDraftModComponent(tourFormState: TourFormState): DraftModComponent {
  return {
    type: "tour",
    extension: selectModComponent(tourFormState, { includeInstanceIds: true }),
    extensionPointConfig: selectStarterBrickDefinition(tourFormState),
  };
}

async function fromModComponent(
  config: ModComponentBase<TourConfig>,
): Promise<TourFormState> {
  const starterBrick = await lookupStarterBrick<
    TourDefinition,
    TourConfig,
    "tour"
  >(config, "tour");

  const { reader } = starterBrick.definition;

  const base = baseFromModComponent(config, starterBrick.definition.type);
  const modComponent = await modComponentWithNormalizedPipeline(
    config.config,
    "tour",
  );

  assertNotNullish(starterBrick.metadata, "Starter brick metadata is required");

  return {
    ...base,
    extension: modComponent,
    extensionPoint: {
      metadata: starterBrick.metadata,
      definition: {
        ...starterBrick.definition,
        reader: readerTypeHack(reader),
        isAvailable: selectStarterBrickAvailability(starterBrick),
      },
    },
  };
}

const config: ModComponentFormStateAdapter<undefined, TourFormState> = {
  displayOrder: 8,
  elementType: "tour",
  label: "Tour",
  baseClass: TourStarterBrickABC,
  flag: "pageeditor-tour",
  EditorNode: TourConfiguration,
  selectNativeElement: undefined,
  icon: faMapSigns,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectModComponent,
  fromModComponent,
};

export default config;
