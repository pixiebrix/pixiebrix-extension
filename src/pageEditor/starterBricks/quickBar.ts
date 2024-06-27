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
import { omitEditorMetadata } from "./pipelineMapping";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { faThLarge } from "@fortawesome/free-solid-svg-icons";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import { QuickBarStarterBrickABC } from "@/starterBricks/quickBar/quickBarStarterBrick";
import QuickBarConfiguration from "@/pageEditor/tabs/quickBar/QuickBarConfiguration";
import type { DraftModComponent } from "@/contentScript/pageEditor/types";
import { type QuickBarFormState } from "./formStateTypes";
import { type SingleLayerReaderConfig } from "@/pageEditor/baseFormStateTypes";
import {
  type QuickBarDefinition,
  type QuickBarConfig,
} from "@/starterBricks/quickBar/quickBarTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

function fromNativeElement(url: string, metadata: Metadata): QuickBarFormState {
  const base = makeInitialBaseState();

  const isAvailable = ALL_SITES_AVAILABILITY;

  const title = "Quick Bar item";

  return {
    type: "quickBar",
    // To simplify the interface, this is kept in sync with the caption
    label: title,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        type: "quickBar",
        reader: getImplicitReader("quickBar"),
        documentUrlPatterns: isAvailable.matchPatterns,
        contexts: ["all"],
        targetMode: "eventTarget",
        defaultOptions: {},
        isAvailable,
      },
    },
    extension: {
      title,
      blockPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: QuickBarFormState,
): StarterBrickDefinitionLike<QuickBarDefinition> {
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
      type: "quickBar",
      documentUrlPatterns,
      contexts,
      targetMode,
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
    },
  });
}

function selectExtension(
  state: QuickBarFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<QuickBarConfig> {
  const { extension } = state;
  const config: QuickBarConfig = {
    title: extension.title,
    icon: extension.icon,
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
  config: ModComponentBase<QuickBarConfig>,
): Promise<QuickBarFormState> {
  const extensionPoint = await lookupExtensionPoint<
    QuickBarDefinition,
    QuickBarConfig,
    "quickBar"
  >(config, "quickBar");

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
        type: "quickBar",
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
  quickBarFormState: QuickBarFormState,
): DraftModComponent {
  return {
    type: "quickBar",
    extension: selectExtension(quickBarFormState, { includeInstanceIds: true }),
    extensionPointConfig: selectStarterBrickDefinition(quickBarFormState),
  };
}

const config: ModComponentFormStateAdapter<undefined, QuickBarFormState> = {
  displayOrder: 1,
  elementType: "quickBar",
  label: "Quick Bar Action",
  baseClass: QuickBarStarterBrickABC,
  EditorNode: QuickBarConfiguration,
  selectNativeElement: undefined,
  icon: faThLarge,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectExtension,
  fromExtension,
};

export default config;
