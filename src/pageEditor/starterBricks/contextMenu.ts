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
  cleanIsAvailable,
  modComponentWithNormalizedPipeline,
  getImplicitReader,
  lookupStarterBrick,
  makeInitialBaseState,
  removeEmptyValues,
  selectStarterBrickAvailability,
  ALL_SITES_AVAILABILITY,
} from "@/pageEditor/starterBricks/base";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { ContextMenuStarterBrickABC } from "@/starterBricks/contextMenu/contextMenuStarterBrick";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import ContextMenuConfiguration from "@/pageEditor/tabs/contextMenu/ContextMenuConfiguration";
import type { DraftModComponent } from "@/contentScript/pageEditor/types";
import { type ContextMenuFormState } from "./formStateTypes";
import { omitEditorMetadata } from "./pipelineMapping";
import { type SingleLayerReaderConfig } from "@/pageEditor/baseFormStateTypes";
import {
  type ContextMenuDefinition,
  type ContextMenuConfig,
} from "@/starterBricks/contextMenu/contextMenuTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

function fromNativeElement(
  url: string,
  metadata: Metadata,
): ContextMenuFormState {
  const base = makeInitialBaseState();

  const isAvailable = ALL_SITES_AVAILABILITY;

  const title = "Context menu item";

  return {
    type: "contextMenu",
    // To simplify the interface, this is kept in sync with the caption
    label: title,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        type: "contextMenu",
        reader: getImplicitReader("contextMenu"),
        documentUrlPatterns: isAvailable.matchPatterns,
        contexts: ["all"],
        targetMode: "eventTarget",
        defaultOptions: {},
        isAvailable,
      },
    },
    extension: {
      title,
      onSuccess: true,
      blockPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: ContextMenuFormState,
): StarterBrickDefinitionLike<ContextMenuDefinition> {
  const { extensionPoint: starterBrick } = formState;
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
      type: "contextMenu",
      documentUrlPatterns,
      contexts,
      targetMode,
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
    },
  });
}

function selectModComponent(
  state: ContextMenuFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<ContextMenuConfig> {
  const { extension: modComponent } = state;
  const config: ContextMenuConfig = {
    title: modComponent.title,
    onSuccess: modComponent.onSuccess,
    action: options.includeInstanceIds
      ? modComponent.blockPipeline
      : omitEditorMetadata(modComponent.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectModComponent(state),
    config,
  });
}

async function fromModComponent(
  config: ModComponentBase<ContextMenuConfig>,
): Promise<ContextMenuFormState> {
  const starterBrick = await lookupStarterBrick<
    ContextMenuDefinition,
    ContextMenuConfig,
    "contextMenu"
  >(config, "contextMenu");
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
    extension: modComponent,
    extensionPoint: {
      metadata: starterBrick.metadata,
      definition: {
        type: "contextMenu",
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
  contextMenuFormState: ContextMenuFormState,
): DraftModComponent {
  return {
    type: "contextMenu",
    extension: selectModComponent(contextMenuFormState, {
      includeInstanceIds: true,
    }),
    extensionPointConfig: selectStarterBrickDefinition(contextMenuFormState),
  };
}

const config: ModComponentFormStateAdapter<undefined, ContextMenuFormState> = {
  displayOrder: 1,
  elementType: "contextMenu",
  label: "Context Menu",
  baseClass: ContextMenuStarterBrickABC,
  EditorNode: ContextMenuConfiguration,
  selectNativeElement: undefined,
  icon: faBars,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectModComponent,
  fromModComponent,
};

export default config;
