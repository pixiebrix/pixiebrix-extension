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
import { FrameworkMeta } from "@/messaging/constants";
import {
  baseSelectExtensionPoint,
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
  Trigger,
  TriggerConfig,
  TriggerDefinition,
  TriggerExtensionPoint,
} from "@/extensionPoints/triggerExtension";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
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
import {
  BaseFormState,
  ElementConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { BlockPipeline } from "@/blocks/combinators";
import React from "react";

const wizard: WizardStep[] = [
  { step: "Name", Component: MetaTab },
  { step: "Foundation", Component: FoundationTab },
  { step: "Data", Component: ReaderTab },
  { step: "Integrations", Component: ServicesTab },
  { step: "Action", Component: EffectTab },
  { step: "Availability", Component: AvailabilityTab },
  { step: "Logs", Component: LogsTab },
];

export interface TriggerFormState extends BaseFormState {
  type: "trigger";

  extensionPoint: {
    metadata: Metadata;
    definition: {
      rootSelector: string | null;
      trigger: Trigger;
      isAvailable: {
        matchPatterns: string;
        selectors: string;
      };
    };
  };

  extension: {
    action: BlockPipeline;
  };
}

function fromNativeElement(
  url: string,
  metadata: Metadata,
  _element: null,
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

function selectExtensionPoint(
  formState: TriggerFormState
): ExtensionPointConfig<TriggerDefinition> {
  const { extensionPoint, readers } = formState;
  const {
    definition: { isAvailable, rootSelector, trigger },
  } = extensionPoint;
  return {
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "trigger",
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
      trigger,
      rootSelector,
    },
  };
}

function selectExtension({
  uuid,
  label,
  extensionPoint,
  extension,
  services,
}: TriggerFormState): IExtension<TriggerConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    _recipe: null,
    label,
    services,
    config: extension,
  };
}

function asDynamicElement(element: TriggerFormState): DynamicDefinition {
  return {
    type: "trigger",
    extension: selectExtension(element),
    extensionPoint: selectExtensionPoint(element),
    readers: makeExtensionReaders(element),
  };
}

async function fromExtensionPoint(
  url: string,
  extensionPoint: ExtensionPointConfig<TriggerDefinition>
): Promise<TriggerFormState> {
  if (extensionPoint.definition.type !== "trigger") {
    throw new Error("Expected trigger extension point type");
  }

  const { type, rootSelector, trigger = "load" } = extensionPoint.definition;

  return {
    uuid: uuidv4(),
    installed: true,
    type,
    label: `My ${getDomain(url)} ${trigger} trigger`,

    readers: await makeReaderFormState(extensionPoint),
    services: [],

    extension: {
      action: [],
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        rootSelector,
        trigger,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

async function fromExtension(
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

const config: ElementConfig<undefined, TriggerFormState> = {
  displayOrder: 4,
  elementType: "trigger",
  label: "Trigger",
  baseClass: TriggerExtensionPoint,
  selectNativeElement: undefined,
  icon: faBolt,
  fromNativeElement,
  asDynamicElement,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
  fromExtensionPoint,
  wizard,
  insertModeHelp: (
    <div>
      <p>
        A trigger panel can be configured to run an action on page load, when an
        first element appears, or on user interactions (e.g., click, hover,
        etc.)
      </p>
      <p>
        Use an existing foundation, or start from scratch to have full control
        over when the trigger runs
      </p>
    </div>
  ),
};

export default config;
