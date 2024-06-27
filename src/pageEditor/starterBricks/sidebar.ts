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

function fromNativeElement(url: string, metadata: Metadata): SidebarFormState {
  const base = makeInitialBaseState();

  const heading = "Sidebar Panel";

  return {
    type: "actionPanel",
    label: heading,
    ...base,
    extensionPoint: {
      metadata,

      definition: {
        type: "actionPanel",
        isAvailable: ALL_SITES_AVAILABILITY,
        reader: getImplicitReader("actionPanel"),

        trigger: "load",

        debounce: {
          waitMillis: 250,
          leading: false,
          trailing: true,
        },

        customEvent: null,
      },
    },
    extension: {
      heading,
      blockPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: SidebarFormState,
): StarterBrickDefinitionLike {
  const { extensionPoint } = formState;
  const {
    definition: { isAvailable, reader, trigger, debounce, customEvent },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectStarterBrick(formState),
    definition: {
      type: "actionPanel",
      reader,
      isAvailable,
      trigger,
      debounce,
      customEvent,
    },
  });
}

function selectExtension(
  state: SidebarFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<SidebarConfig> {
  const { extension } = state;
  const config: SidebarConfig = {
    heading: extension.heading,
    body: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
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
    type: "actionPanel",
    extension: selectExtension(sidebarFormState, { includeInstanceIds: true }),
    extensionPointConfig: selectStarterBrickDefinition(sidebarFormState),
  };
}

async function fromExtension(
  config: ModComponentBase<SidebarConfig>,
): Promise<SidebarFormState> {
  const extensionPoint = await lookupStarterBrick<
    SidebarDefinition,
    SidebarConfig,
    "actionPanel"
  >(config, "actionPanel");

  const base = baseFromModComponent(config, extensionPoint.definition.type);
  const extension = await modComponentWithNormalizedPipeline(
    config.config,
    "body",
  );

  const {
    trigger = "load",
    debounce,
    customEvent,
    reader,
  } = extensionPoint.definition;

  assertNotNullish(
    extensionPoint.metadata,
    "Starter brick metadata is required",
  );

  return {
    ...base,
    extension,
    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        trigger,
        debounce,
        customEvent,
        reader: readerTypeHack(reader),
        isAvailable: selectStarterBrickAvailability(extensionPoint),
      },
    },
  };
}

const config: ModComponentFormStateAdapter<never, SidebarFormState> = {
  displayOrder: 3,
  elementType: "actionPanel",
  label: "Sidebar Panel",
  baseClass: SidebarStarterBrickABC,
  selectNativeElement: undefined,
  icon: faColumns,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectExtension,
  fromExtension,
  EditorNode: SidebarConfiguration,
};

export default config;
