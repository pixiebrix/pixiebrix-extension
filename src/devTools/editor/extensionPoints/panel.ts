/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { IExtension, Metadata } from "@/core";
import { FrameworkMeta } from "@/messaging/constants";
import { PanelFormState, PanelTraits } from "@/devTools/editor/editorSlice";
import {
  getDomain,
  makeBaseState,
  makeExtensionReaders,
  makeIsAvailable,
  makeReaderFormState,
  WizardStep,
  PROPERTY_TABLE_BODY,
  selectIsAvailable,
  lookupExtensionPoint,
} from "@/devTools/editor/extensionPoints/base";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray, identity, pickBy } from "lodash";
import { PanelConfig, PanelDefinition } from "@/extensionPoints/panelExtension";
import FoundationTab from "@/devTools/editor/tabs/panel/FoundationTab";
import ReaderTab from "@/devTools/editor/tabs/reader/ReaderTab";
import PanelTab from "@/devTools/editor/tabs/panel/PanelTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import { DynamicDefinition } from "@/nativeEditor";
import { PanelSelectionResult } from "@/nativeEditor/insertPanel";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import MetaTab from "@/devTools/editor/tabs/MetaTab";
import { v4 as uuidv4 } from "uuid";
import { boolean } from "@/utils";

export const wizard: WizardStep[] = [
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

const DEFAULT_TRAITS: PanelTraits = {
  style: {
    mode: "inherit",
  },
};

export function makePanelState(
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
      body: PROPERTY_TABLE_BODY,
    },
  };
}

export function makePanelExtensionPoint({
  extensionPoint,
  readers,
}: PanelFormState): ExtensionPointConfig<PanelDefinition> {
  const {
    metadata,
    definition: { isAvailable, position, template, containerSelector },
  } = extensionPoint;

  return {
    apiVersion: "v1",
    kind: "extensionPoint",
    metadata: {
      id: metadata.id,
      version: "1.0.0",
      name: metadata.name,
      description: "Panel created with the Page Editor",
    },
    definition: {
      type: "panel",
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
      containerSelector: containerSelector,
      position,
      template,
    },
  };
}

export function makePanelExtension({
  uuid,
  label,
  extensionPoint,
  extension,
  services,
}: PanelFormState): IExtension<PanelConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    label,
    services,
    config: extension,
  };
}

export function makePanelConfig(element: PanelFormState): DynamicDefinition {
  return {
    type: "panel",
    extension: makePanelExtension(element),
    extensionPoint: makePanelExtensionPoint(element),
    readers: makeExtensionReaders(element),
  };
}

export async function makePanelExtensionFormState(
  url: string,
  extensionPoint: ExtensionPointConfig<PanelDefinition>
): Promise<PanelFormState> {
  if (extensionPoint.definition.type !== "panel") {
    throw new Error("Expected panel extension point type");
  }

  return {
    uuid: uuidv4(),
    installed: true,
    type: extensionPoint.definition.type,
    label: `My ${getDomain(url)} panel`,

    readers: await makeReaderFormState(extensionPoint),
    services: [],

    extension: {
      heading:
        extensionPoint.definition.defaultOptions.heading ?? "Custom Panel",
      collapsible: boolean(
        extensionPoint.definition.defaultOptions.collapsible ?? false
      ),
      body: PROPERTY_TABLE_BODY,
    },

    containerInfo: null,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      traits: {
        // we don't provide a way to set style anywhere yet so this doesn't apply yet
        style: { mode: "inherit" },
      },
      definition: {
        ...extensionPoint.definition,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

export async function makePanelFormState(
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
        // we don't provide a way to set style anywhere yet so this doesn't apply yet
        style: { mode: "inherit" },
      },
      definition: {
        ...extensionPoint.definition,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}
