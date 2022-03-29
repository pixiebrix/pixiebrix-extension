/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { IExtension, Metadata } from "@/core";
import {
  baseFromExtension,
  baseSelectExtension,
  baseSelectExtensionPoint,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  extensionWithNormalizedPipeline,
  omitEditorMetadata,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  readerTypeHack,
  removeEmptyValues,
  selectIsAvailable,
} from "@/pageEditor/extensionPoints/base";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import {
  PanelConfig,
  PanelDefinition,
  PanelExtensionPoint,
} from "@/extensionPoints/panelExtension";
import { uuidv4 } from "@/types/helpers";
import { boolean } from "@/utils";
import { getDomain } from "@/permissions/patterns";
import { faWindowMaximize } from "@fortawesome/free-solid-svg-icons";
import { ElementConfig } from "@/pageEditor/extensionPoints/elementConfig";
import PanelConfiguration from "@/pageEditor/tabs/panel/PanelConfiguration";
import { insertPanel } from "@/contentScript/messenger/api";
import {
  DynamicDefinition,
  PanelSelectionResult,
} from "@/contentScript/nativeEditor/types";
import { PanelFormState, PanelTraits } from "./formStateTypes";

const DEFAULT_TRAITS: PanelTraits = {
  style: {
    mode: "inherit",
  },
};

function fromNativeElement(
  url: string,
  metadata: Metadata,
  panel: PanelSelectionResult
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
        isAvailable: makeIsAvailable(url),
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

function selectExtensionPoint(
  formState: PanelFormState
): ExtensionPointConfig<PanelDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: { isAvailable, position, template, reader, containerSelector },
  } = extensionPoint;

  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
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

function selectExtension(
  state: PanelFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<PanelConfig> {
  const { extension } = state;
  const config: PanelConfig = {
    heading: extension.heading,
    body: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
    collapsible: extension.collapsible,
    shadowDOM: extension.shadowDOM,
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
  });
}

function asDynamicElement(element: PanelFormState): DynamicDefinition {
  return {
    type: "panel",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPoint: selectExtensionPoint(element),
  };
}

async function fromExtensionPoint(
  url: string,
  extensionPoint: ExtensionPointConfig<PanelDefinition>
): Promise<PanelFormState> {
  if (extensionPoint.definition.type !== "panel") {
    throw new Error("Expected panel extension point type");
  }

  const { heading = "Custom Panel", collapsible = false } =
    extensionPoint.definition.defaultOptions ?? {};

  return {
    uuid: uuidv4(),
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    installed: true,
    type: "panel",
    label: `My ${getDomain(url)} panel`,

    services: [],

    optionsArgs: {},

    extension: {
      heading,
      collapsible: boolean(collapsible ?? false),
      blockPipeline: [],
    },

    // There's no containerInfo for the page because the user did not select it during the session
    containerInfo: null,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      traits: {
        // We don't provide a way to set style anywhere yet so this doesn't apply yet
        style: { mode: "inherit" },
      },
      definition: {
        ...extensionPoint.definition,
        reader: readerTypeHack(extensionPoint.definition.reader),
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
    recipe: undefined,
  };
}

async function fromExtension(
  config: IExtension<PanelConfig>
): Promise<PanelFormState> {
  const extensionPoint = await lookupExtensionPoint<
    PanelDefinition,
    PanelConfig,
    "panel"
  >(config, "panel");

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = extensionWithNormalizedPipeline(config.config, "body", {
    heading: "",
  });

  return {
    ...base,

    extension,

    containerInfo: null,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      traits: {
        // We don't provide a way to set style anywhere yet so this doesn't apply yet
        style: { mode: "inherit" },
      },
      definition: {
        ...extensionPoint.definition,
        reader: readerTypeHack(extensionPoint.definition.reader),
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

const config: ElementConfig<PanelSelectionResult, PanelFormState> = {
  displayOrder: 2,
  elementType: "panel",
  label: "Panel",
  icon: faWindowMaximize,
  baseClass: PanelExtensionPoint,
  selectNativeElement: insertPanel,
  EditorNode: PanelConfiguration,
  fromNativeElement,
  asDynamicElement,
  fromExtensionPoint,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
};

export default config;
