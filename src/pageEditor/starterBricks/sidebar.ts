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
  readerTypeHack,
  removeEmptyValues,
  selectStarterBrickAvailability,
  ALL_SITES_AVAILABILITY,
} from "@/pageEditor/starterBricks/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { SidebarStarterBrickABC } from "@/starterBricks/sidebar/sidebarStarterBrick";
import { faColumns } from "@fortawesome/free-solid-svg-icons";
import SidebarConfiguration from "@/pageEditor/tabs/sidebar/SidebarConfiguration";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import type { DraftModComponent } from "@/contentScript/pageEditor/types";
import { type SidebarFormState } from "./formStateTypes";
import {
  type SidebarConfig,
  type SidebarDefinition,
} from "@/starterBricks/sidebar/sidebarStarterBrickTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

function fromNativeElement({
  modMetadata,
  starterBrickMetadata,
}: {
  modMetadata: ModMetadata;
  starterBrickMetadata: Metadata;
}): SidebarFormState {
  const base = makeInitialBaseState({
    modMetadata,
  });

  const heading = "Sidebar Panel";

  return {
    label: heading,
    ...base,
    starterBrick: {
      metadata: starterBrickMetadata,

      definition: {
        type: StarterBrickTypes.SIDEBAR_PANEL,
        isAvailable: ALL_SITES_AVAILABILITY,
        reader: getImplicitReader(StarterBrickTypes.SIDEBAR_PANEL),

        trigger: "load",

        debounce: {
          waitMillis: 250,
          leading: false,
          trailing: true,
        },

        customEvent: null,
      },
    },
    modComponent: {
      heading,
      brickPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: SidebarFormState,
): StarterBrickDefinitionLike {
  const { starterBrick } = formState;
  const {
    definition: { isAvailable, reader, trigger, debounce, customEvent },
  } = starterBrick;
  return removeEmptyValues({
    ...baseSelectStarterBrick(formState),
    definition: {
      type: StarterBrickTypes.SIDEBAR_PANEL,
      reader,
      isAvailable,
      trigger,
      debounce,
      customEvent,
    },
  });
}

function selectModComponent(
  state: SidebarFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<SidebarConfig> {
  const { modComponent } = state;
  const config: SidebarConfig = {
    heading: modComponent.heading,
    body: options.includeInstanceIds
      ? modComponent.brickPipeline
      : omitEditorMetadata(modComponent.brickPipeline),
  };
  return removeEmptyValues({
    ...baseSelectModComponent(state),
    config,
  });
}

function asDraftModComponent(
  sidebarFormState: SidebarFormState,
): DraftModComponent {
  return {
    type: StarterBrickTypes.SIDEBAR_PANEL,
    extension: selectModComponent(sidebarFormState, {
      includeInstanceIds: true,
    }),
    extensionPointConfig: selectStarterBrickDefinition(sidebarFormState),
  };
}

async function fromModComponent(
  config: ModComponentBase<SidebarConfig>,
): Promise<SidebarFormState> {
  const starterBrick = await lookupStarterBrick<
    SidebarDefinition,
    SidebarConfig,
    typeof StarterBrickTypes.SIDEBAR_PANEL
  >(config, StarterBrickTypes.SIDEBAR_PANEL);

  const base = baseFromModComponent(config, starterBrick.definition.type);
  const modComponent = await modComponentWithNormalizedPipeline(
    config.config,
    "body",
  );

  const {
    trigger = "load",
    debounce,
    customEvent,
    reader,
  } = starterBrick.definition;

  assertNotNullish(starterBrick.metadata, "Starter brick metadata is required");

  return {
    ...base,
    modComponent,
    starterBrick: {
      metadata: starterBrick.metadata,
      definition: {
        ...starterBrick.definition,
        trigger,
        debounce,
        customEvent,
        reader: readerTypeHack(reader),
        isAvailable: selectStarterBrickAvailability(starterBrick),
      },
    },
  };
}

const config: ModComponentFormStateAdapter<never, SidebarFormState> = {
  displayOrder: 3,
  starterBrickType: StarterBrickTypes.SIDEBAR_PANEL,
  label: "Sidebar Panel",
  baseClass: SidebarStarterBrickABC,
  selectNativeElement: undefined,
  icon: faColumns,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectModComponent,
  fromModComponent,
  StarterBrickConfiguration: SidebarConfiguration,
};

export default config;
