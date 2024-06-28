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
} from "@/pageEditor/starterBricks/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { PanelStarterBrickABC } from "@/starterBricks/panel/panelStarterBrick";
import { getDomain } from "@/permissions/patterns";
import { faWindowMaximize } from "@fortawesome/free-solid-svg-icons";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import PanelConfiguration from "@/pageEditor/tabs/panel/PanelConfiguration";
import { insertPanel } from "@/contentScript/messenger/api";
import {
  type DraftModComponent,
  type PanelSelectionResult,
} from "@/contentScript/pageEditor/types";
import { type PanelFormState, type PanelTraits } from "./formStateTypes";
import {
  type PanelDefinition,
  type PanelConfig,
} from "@/starterBricks/panel/panelStarterBrickTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

const DEFAULT_TRAITS: PanelTraits = {
  style: {
    mode: "inherit",
  },
};

function fromNativeElement(
  url: string,
  metadata: Metadata,
  panel: PanelSelectionResult,
): PanelFormState {
  return {
    type: "panel",
    label: `My ${getDomain(url)} panel`,
    ...makeInitialBaseState(panel.uuid),
    containerInfo: panel.containerInfo,
    extensionPoint: {
      metadata,
      definition: {
        ...panel.foundation,
        reader: getImplicitReader("panel"),
        isAvailable: getDefaultAvailabilityForUrl(url),
      },
      traits: DEFAULT_TRAITS,
    },
    extension: {
      heading: panel.panel.heading,
      collapsible: panel.panel.collapsible ?? false,
      shadowDOM: panel.panel.shadowDOM ?? true,
      blockPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: PanelFormState,
): StarterBrickDefinitionLike<PanelDefinition> {
  const { extensionPoint: starterBrick } = formState;
  const {
    definition: { isAvailable, position, template, reader, containerSelector },
  } = starterBrick;

  return removeEmptyValues({
    ...baseSelectStarterBrick(formState),
    definition: {
      type: "panel",
      reader,
      isAvailable,
      containerSelector,
      position,
      template,
    },
  });
}

function selectModComponent(
  state: PanelFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<PanelConfig> {
  const { extension: modComponent } = state;
  const config: PanelConfig = {
    heading: modComponent.heading,
    body: options.includeInstanceIds
      ? modComponent.blockPipeline
      : omitEditorMetadata(modComponent.blockPipeline),
    collapsible: modComponent.collapsible,
    shadowDOM: modComponent.shadowDOM,
  };
  return removeEmptyValues({
    ...baseSelectModComponent(state),
    config,
  });
}

function asDraftModComponent(
  panelFormState: PanelFormState,
): DraftModComponent {
  return {
    type: "panel",
    extension: selectModComponent(panelFormState, { includeInstanceIds: true }),
    extensionPointConfig: selectStarterBrickDefinition(panelFormState),
  };
}

async function fromModComponent(
  config: ModComponentBase<PanelConfig>,
): Promise<PanelFormState> {
  const starterBrick = await lookupStarterBrick<
    PanelDefinition,
    PanelConfig,
    "panel"
  >(config, "panel");

  const base = baseFromModComponent(config, starterBrick.definition.type);
  const modComponent = await modComponentWithNormalizedPipeline(
    config.config,
    "body",
    {
      heading: "",
    },
  );

  assertNotNullish(starterBrick.metadata, "Starter brick metadata is required");

  return {
    ...base,
    extension: modComponent,
    containerInfo: null,
    extensionPoint: {
      metadata: starterBrick.metadata,
      traits: {
        // We don't provide a way to set style anywhere yet so this doesn't apply yet
        style: { mode: "inherit" },
      },
      definition: {
        ...starterBrick.definition,
        reader: readerTypeHack(starterBrick.definition.reader),
        isAvailable: selectStarterBrickAvailability(starterBrick),
      },
    },
  };
}

const config: ModComponentFormStateAdapter<
  PanelSelectionResult,
  PanelFormState
> = {
  displayOrder: 2,
  elementType: "panel",
  label: "Panel",
  icon: faWindowMaximize,
  baseClass: PanelStarterBrickABC,
  selectNativeElement: insertPanel,
  flag: "page-editor-extension-panel",
  EditorNode: PanelConfiguration,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectModComponent,
  fromModComponent,
};

export default config;
