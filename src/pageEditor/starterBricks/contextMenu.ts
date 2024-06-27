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
  cleanIsAvailable,
  extensionWithNormalizedPipeline,
  getImplicitReader,
  lookupExtensionPoint,
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
  const { extensionPoint } = formState;
  const {
    definition: {
      isAvailable,
      documentUrlPatterns,
      reader,
      targetMode,
      contexts = ["all"],
    },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
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

function selectExtension(
  state: ContextMenuFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<ContextMenuConfig> {
  const { extension } = state;
  const config: ContextMenuConfig = {
    title: extension.title,
    onSuccess: extension.onSuccess,
    action: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
  });
}

async function fromExtension(
  config: ModComponentBase<ContextMenuConfig>,
): Promise<ContextMenuFormState> {
  const extensionPoint = await lookupExtensionPoint<
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
  } = extensionPoint.definition;

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
    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        type: "contextMenu",
        documentUrlPatterns,
        defaultOptions,
        targetMode,
        contexts,
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectStarterBrickAvailability(extensionPoint),
      },
    },
  };
}

function asDraftModComponent(
  contextMenuFormState: ContextMenuFormState,
): DraftModComponent {
  return {
    type: "contextMenu",
    extension: selectExtension(contextMenuFormState, {
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
  selectExtension,
  fromExtension,
};

export default config;
