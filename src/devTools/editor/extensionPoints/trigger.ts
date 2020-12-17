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
import { TriggerFormState } from "@/devTools/editor/editorSlice";
import {
  makeBaseState,
  makeExtensionReader,
  makeIsAvailable,
} from "@/devTools/editor/extensionPoints/base";
import { v4 as uuidv4 } from "uuid";
import {
  TriggerConfig,
  TriggerDefinition,
} from "@/extensionPoints/triggerExtension";
import { DynamicDefinition } from "@/nativeEditor";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { identity, pickBy } from "lodash";
import ReaderTab from "@/devTools/editor/tabs/ReaderTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";
import FoundationTab from "@/devTools/editor/tabs/trigger/FoundationTab";

export const wizard = [
  { step: "Foundation", Component: FoundationTab },
  { step: "Reader", Component: ReaderTab },
  { step: "Services", Component: ServicesTab },
  { step: "Effect", Component: EffectTab },
  { step: "Availability", Component: AvailabilityTab },
  { step: "Logs", Component: LogsTab },
];

export function makeTriggerState(
  url: string,
  metadata: Metadata,
  frameworks: FrameworkMeta[]
): TriggerFormState {
  return {
    type: "trigger",
    ...makeBaseState(uuidv4(), null, metadata, frameworks),
    extensionPoint: {
      metadata,
      definition: {
        rootSelector: null,
        trigger: "load",
        isAvailable: makeIsAvailable(url),
      },
    },
    extension: {
      action: [],
    },
  };
}

export function makeTriggerExtensionPoint({
  extensionPoint,
  reader,
}: TriggerFormState): ExtensionPointConfig<TriggerDefinition> {
  const {
    metadata,
    definition: { isAvailable, rootSelector, trigger },
  } = extensionPoint;

  return {
    apiVersion: "v1",
    kind: "extensionPoint",
    metadata: {
      id: metadata.id,
      version: "1.0.0",
      name: metadata.name,
      description: "Trigger created with the devtools",
    },
    definition: {
      type: "trigger",
      reader: reader.metadata.id,
      isAvailable: pickBy(isAvailable, identity),
      trigger,
      rootSelector,
    },
  };
}

export function makeTriggerExtension({
  uuid,
  extensionPoint,
  extension,
  services,
}: TriggerFormState): IExtension<TriggerConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    label: "Custom Trigger",
    services,
    config: extension,
  };
}

export function makeTriggerConfig(
  element: TriggerFormState
): DynamicDefinition {
  return {
    extension: makeTriggerExtension(element),
    extensionPoint: makeTriggerExtensionPoint(element),
    reader: makeExtensionReader(element),
  };
}
