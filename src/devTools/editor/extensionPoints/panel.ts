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
import { FrameworkMeta } from "@/messaging/constants";
import {
  makeBaseState,
  makeExtensionReaders,
  makeIsAvailable,
  makeReaderFormState,
  WizardStep,
  selectIsAvailable,
  lookupExtensionPoint,
  baseSelectExtensionPoint,
} from "@/devTools/editor/extensionPoints/base";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray, identity, pickBy } from "lodash";
import {
  PanelConfig,
  PanelDefinition,
  PanelExtensionPoint,
} from "@/extensionPoints/panelExtension";
import FoundationTab from "@/devTools/editor/tabs/panel/FoundationTab";
import ReaderTab from "@/devTools/editor/tabs/reader/ReaderTab";
import PanelTab from "@/devTools/editor/tabs/panel/PanelTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import { PanelSelectionResult } from "@/nativeEditor/insertPanel";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import MetaTab from "@/devTools/editor/tabs/MetaTab";
import { v4 as uuidv4 } from "uuid";
import { boolean } from "@/utils";
import { getDomain } from "@/permissions/patterns";
import { faWindowMaximize } from "@fortawesome/free-solid-svg-icons";
import * as nativeOperations from "@/background/devtools";
import {
  BaseFormState,
  ElementConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { ElementInfo } from "@/nativeEditor/frameworks";
import { MenuPosition } from "@/extensionPoints/menuItemExtension";
import { BlockPipeline } from "@/blocks/combinators";

const wizard: WizardStep[] = [
  { step: "Name", Component: MetaTab },
  { step: "Foundation", Component: FoundationTab },
  { step: "Data", Component: ReaderTab },
  { step: "Panel", Component: PanelTab },
  { step: "Integrations", Component: ServicesTab },
  {
    step: "Content",
    Component: EffectTab,
    extraProps: { fieldName: "extension.body" },
  },
  { step: "Availability", Component: AvailabilityTab },
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
      isAvailable: {
        matchPatterns: string;
        selectors: string;
      };
    };
    traits: PanelTraits;
  };

  extension: {
    heading: string;
    body: BlockPipeline;
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
  panel: PanelSelectionResult,
  frameworks: FrameworkMeta[]
): PanelFormState {
  return {
    type: "panel",
    label: `My ${getDomain(url)} panel`,
    ...makeBaseState(
      panel.uuid,
      panel.foundation.containerSelector,
      metadata,
      frameworks
    ),
    containerInfo: panel.containerInfo,
    extensionPoint: {
      metadata,
      definition: {
        ...panel.foundation,
        isAvailable: makeIsAvailable(url),
      },
      traits: DEFAULT_TRAITS,
    },
    extension: {
      heading: panel.panel.heading,
      collapsible: panel.panel.collapsible ?? false,
      shadowDOM: panel.panel.shadowDOM ?? true,
      body: [],
    },
  };
}

function selectExtensionPoint(
  formState: PanelFormState
): ExtensionPointConfig<PanelDefinition> {
  const { extensionPoint, readers } = formState;
  const {
    definition: { isAvailable, position, template, containerSelector },
  } = extensionPoint;

  return {
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "panel",
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
      containerSelector,
      position,
      template,
    },
  };
}

function selectExtension({
  uuid,
  label,
  extensionPoint,
  extension,
  services,
}: PanelFormState): IExtension<PanelConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    _recipe: null,
    label,
    services,
    config: extension,
  };
}

function asDynamicElement(element: PanelFormState): DynamicDefinition {
  return {
    type: "panel",
    extension: selectExtension(element),
    extensionPoint: selectExtensionPoint(element),
    readers: makeExtensionReaders(element),
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
    installed: true,
    type: "panel",
    label: `My ${getDomain(url)} panel`,

    readers: await makeReaderFormState(extensionPoint),
    services: [],

    extension: {
      heading,
      collapsible: boolean(collapsible ?? false),
      body: [],
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

  return {
    uuid: config.id,
    installed: true,
    type: extensionPoint.definition.type,
    label: config.label,

    readers: await makeReaderFormState(extensionPoint),
    services: config.services,

    extension: {
      ...config.config,
      heading: config.config.heading,
      body: castArray(config.config.body),
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
  selectNativeElement: nativeOperations.insertPanel,
  wizard,
  fromNativeElement,
  asDynamicElement,
  fromExtensionPoint,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
};

export default config;
