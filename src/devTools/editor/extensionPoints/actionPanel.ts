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
import { ActionPanelFormState } from "@/devTools/editor/editorSlice";
import {
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
import {
  ActionPanelConfig,
  PanelDefinition,
} from "@/extensionPoints/actionPanelExtension";
import FoundationTab from "@/devTools/editor/tabs/actionPanel/FoundationTab";
import ReaderTab from "@/devTools/editor/tabs/reader/ReaderTab";
import PanelTab from "@/devTools/editor/tabs/actionPanel/PanelTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import { DynamicDefinition } from "@/nativeEditor";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import MetaTab from "@/devTools/editor/tabs/MetaTab";
import { v4 as uuidv4 } from "uuid";
import { getDomain } from "@/permissions/patterns";

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

export function makeActionPanelState(
  url: string,
  metadata: Metadata,
  frameworks: FrameworkMeta[]
): ActionPanelFormState {
  const base = makeBaseState(uuidv4(), null, metadata, frameworks);

  const heading = `${getDomain(url)} side panel`;

  return {
    type: "actionPanel",
    label: heading,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        isAvailable: makeIsAvailable(url),
      },
    },
    extension: {
      heading,
      body: PROPERTY_TABLE_BODY,
    },
  };
}

export function makeActionPanelExtensionPoint({
  extensionPoint,
  readers,
}: ActionPanelFormState): ExtensionPointConfig<PanelDefinition> {
  const {
    metadata,
    definition: { isAvailable },
  } = extensionPoint;

  return {
    apiVersion: "v1",
    kind: "extensionPoint",
    metadata: {
      id: metadata.id,
      version: "1.0.0",
      name: metadata.name,
      description: "Side Panel created with the Page Editor",
    },
    definition: {
      type: "actionPanel",
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
    },
  };
}

export function makeActionPanelExtension({
  uuid,
  label,
  extensionPoint,
  extension,
  services,
}: ActionPanelFormState): IExtension<ActionPanelConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    label,
    services,
    config: extension,
  };
}

export function makeActionPanelConfig(
  element: ActionPanelFormState
): DynamicDefinition {
  return {
    type: "actionPanel",
    extension: makeActionPanelExtension(element),
    extensionPoint: makeActionPanelExtensionPoint(element),
    readers: makeExtensionReaders(element),
  };
}

export async function makeActionPanelExtensionFormState(
  url: string,
  extensionPoint: ExtensionPointConfig<PanelDefinition>
): Promise<ActionPanelFormState> {
  if (extensionPoint.definition.type !== "actionPanel") {
    throw new Error("Expected actionPanel extension point type");
  }

  const heading = `${getDomain(url)} side panel`;

  return {
    uuid: uuidv4(),
    installed: true,
    type: extensionPoint.definition.type,
    label: heading,

    readers: await makeReaderFormState(extensionPoint),
    services: [],

    extension: {
      heading: heading,
      body: PROPERTY_TABLE_BODY,
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

export async function makeActionPanelFormState(
  config: IExtension<ActionPanelConfig>
): Promise<ActionPanelFormState> {
  const extensionPoint = await lookupExtensionPoint<
    PanelDefinition,
    ActionPanelConfig,
    "actionPanel"
  >(config, "actionPanel");

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

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}
