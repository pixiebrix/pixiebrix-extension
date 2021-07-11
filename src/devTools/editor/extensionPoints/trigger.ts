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
import { TriggerFormState } from "@/devTools/editor/editorSlice";
import {
  lookupExtensionPoint,
  makeBaseState,
  makeExtensionReaders,
  makeIsAvailable,
  makeReaderFormState,
  selectIsAvailable,
  WizardStep,
} from "@/devTools/editor/extensionPoints/base";
import { v4 as uuidv4 } from "uuid";
import {
  TriggerConfig,
  TriggerDefinition,
} from "@/extensionPoints/triggerExtension";
import { DynamicDefinition } from "@/nativeEditor";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray, identity, pickBy } from "lodash";
import ReaderTab from "@/devTools/editor/tabs/reader/ReaderTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";
import FoundationTab from "@/devTools/editor/tabs/trigger/FoundationTab";
import MetaTab from "@/devTools/editor/tabs/MetaTab";
import { getDomain } from "@/permissions/patterns";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { ElementConfig } from "@/devTools/editor/extensionPoints/elementConfig";

export const wizard: WizardStep[] = [
  { step: "Name", Component: MetaTab },
  { step: "Foundation", Component: FoundationTab },
  { step: "Data", Component: ReaderTab },
  { step: "Integrations", Component: ServicesTab },
  { step: "Action", Component: EffectTab },
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
    label: `My ${getDomain(url)} trigger`,
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
  readers,
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
      description: "Trigger created with the Page Editor",
    },
    definition: {
      type: "trigger",
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
      trigger,
      rootSelector,
    },
  };
}

export function makeTriggerExtension({
  uuid,
  label,
  extensionPoint,
  extension,
  services,
}: TriggerFormState): IExtension<TriggerConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    label,
    services,
    config: extension,
  };
}

function asDynamicElement(element: TriggerFormState): DynamicDefinition {
  return {
    type: "trigger",
    extension: makeTriggerExtension(element),
    extensionPoint: makeTriggerExtensionPoint(element),
    readers: makeExtensionReaders(element),
  };
}

export async function makeTriggerFormState(
  config: IExtension<TriggerConfig>
): Promise<TriggerFormState> {
  const extensionPoint = await lookupExtensionPoint<
    TriggerDefinition,
    TriggerConfig,
    "trigger"
  >(config, "trigger");

  return {
    uuid: config.id,
    installed: true,
    type: extensionPoint.definition.type,
    label: config.label,

    readers: await makeReaderFormState(extensionPoint),
    services: config.services,

    extension: {
      ...config.config,
      action: castArray(config.config.action),
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        rootSelector: extensionPoint.definition.rootSelector,
        trigger: extensionPoint.definition.trigger,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

const config: ElementConfig<never, TriggerFormState> = {
  elementType: "trigger",
  label: "Trigger",
  insert: undefined,
  icon: faBolt,
  makeState: (
    url: string,
    metadata: Metadata,
    element: unknown,
    frameworks: FrameworkMeta[]
  ) => makeTriggerState(url, metadata, frameworks),
  asDynamicElement,
  extensionPoint: makeTriggerExtensionPoint,
  extension: makeTriggerExtension,
  formState: makeTriggerFormState,
};

export default config;
