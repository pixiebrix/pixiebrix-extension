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
import { PanelFormState } from "@/devTools/editor/editorSlice";
import {
  makeBaseState,
  makeExtensionReader,
  makeIsAvailable,
  WizardStep,
} from "@/devTools/editor/extensionPoints/base";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { identity, pickBy } from "lodash";
import { PanelConfig, PanelDefinition } from "@/extensionPoints/panelExtension";
import FoundationTab from "@/devTools/editor/tabs/panel/FoundationTab";
import ReaderTab from "@/devTools/editor/tabs/ReaderTab";
import PanelTab from "@/devTools/editor/tabs/panel/PanelTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import { DynamicDefinition } from "@/nativeEditor";
import { PanelSelectionResult } from "@/nativeEditor/insertPanel";
import RendererTab from "@/devTools/editor/tabs/RendererTab";
import MetaTab from "@/devTools/editor/tabs/MetaTab";

export const wizard: WizardStep[] = [
  { step: "Name", Component: MetaTab },
  { step: "Foundation", Component: FoundationTab },
  { step: "Reader", Component: ReaderTab },
  { step: "Panel", Component: PanelTab },
  { step: "Services", Component: ServicesTab },
  { step: "Renderer", Component: RendererTab },
  { step: "Availability", Component: AvailabilityTab },
  { step: "Logs", Component: LogsTab },
];

export function makePanelState(
  url: string,
  metadata: Metadata,
  panel: PanelSelectionResult,
  frameworks: FrameworkMeta[]
): PanelFormState {
  return {
    type: "panel",
    label: "My custom panel",
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
      traits: {
        style: {
          mode: "inherit",
        },
      },
    },
    extension: {
      heading: panel.panel.heading,
      collapsible: panel.panel.collapsible ?? false,
      shadowDOM: panel.panel.shadowDOM ?? true,
      body: [
        {
          id: "@pixiebrix/property-table",
          config: {},
        },
      ],
    },
  };
}

export function makePanelExtensionPoint({
  extensionPoint,
  reader,
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
      description: "Panel created with the devtools",
    },
    definition: {
      type: "panel",
      reader: reader.metadata.id,
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
    extension: makePanelExtension(element),
    extensionPoint: makePanelExtensionPoint(element),
    reader: makeExtensionReader(element),
  };
}
