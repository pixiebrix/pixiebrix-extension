/* eslint-disable filenames/match-exported */
/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
  omitEditorMetadata,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  readerTypeHack,
  removeEmptyValues,
  selectIsAvailable,
  withInstanceIds,
  WizardStep,
} from "@/devTools/editor/extensionPoints/base";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray } from "lodash";
import {
  PanelConfig,
  PanelDefinition,
  PanelExtensionPoint,
} from "@/extensionPoints/panelExtension";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import { PanelSelectionResult } from "@/nativeEditor/insertPanel";
import { uuidv4 } from "@/types/helpers";
import { boolean } from "@/utils";
import { getDomain } from "@/permissions/patterns";
import { faWindowMaximize } from "@fortawesome/free-solid-svg-icons";
import {
  BaseFormState,
  ElementConfig,
  SingleLayerReaderConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { ElementInfo } from "@/nativeEditor/frameworks";
import { MenuPosition } from "@/extensionPoints/menuItemExtension";
import { BlockPipeline, NormalizedAvailability } from "@/blocks/types";
import EditTab from "@/devTools/editor/tabs/editTab/EditTab";
import PanelConfiguration from "@/devTools/editor/tabs/panel/PanelConfiguration";
import { insertPanel } from "@/contentScript/messenger/api";

const wizard: WizardStep[] = [
  { step: "Edit", Component: EditTab },
  { step: "Logs", Component: LogsTab },
];

export type PanelTraits = {
  style: {
    mode: "default" | "inherit";
  };
};

export interface PanelFormState extends BaseFormState {
  type: "panel";

  containerInfo: ElementInfo;

  extensionPoint: {
    metadata: Metadata;
    definition: {
      containerSelector: string;
      position?: MenuPosition;
      template: string;
      reader: SingleLayerReaderConfig;
      isAvailable: NormalizedAvailability;
    };
    traits: PanelTraits;
  };

  extension: {
    heading: string;
    blockPipeline: BlockPipeline;
    collapsible?: boolean;
    shadowDOM?: boolean;
  };
}

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
  { extension, ...state }: PanelFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<PanelConfig> {
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

  const blockPipeline = withInstanceIds(castArray(config.config.body));

  return {
    ...baseFromExtension(config, extensionPoint.definition.type),

    extension: {
      heading: config.config.heading ?? "",
      ...config.config,
      blockPipeline,
    },

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
  wizard,
  fromNativeElement,
  asDynamicElement,
  fromExtensionPoint,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
};

export default config;
