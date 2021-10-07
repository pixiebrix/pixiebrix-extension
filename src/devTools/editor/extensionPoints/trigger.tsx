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
  baseSelectExtensionPoint,
  excludeInstanceIds,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  pipelineFromExtension,
  readerTypeHack,
  removeEmptyValues,
  selectIsAvailable,
  withInstanceIds,
  WizardStep,
} from "@/devTools/editor/extensionPoints/base";
import { uuidv4 } from "@/types/helpers";
import {
  Trigger,
  TriggerConfig,
  TriggerDefinition,
  TriggerExtensionPoint,
} from "@/extensionPoints/triggerExtension";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray, identity, pickBy } from "lodash";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import { getDomain } from "@/permissions/patterns";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import {
  BaseFormState,
  ElementConfig,
  SingleLayerReaderConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { NormalizedAvailability } from "@/blocks/types";
import React from "react";
import EditTab from "@/devTools/editor/tabs/editTab/EditTab";
import TriggerConfiguration from "@/devTools/editor/tabs/trigger/TriggerConfiguration";

const wizard: WizardStep[] = [
  { step: "Edit", Component: EditTab },
  { step: "Logs", Component: LogsTab },
];

export interface TriggerFormState extends BaseFormState {
  type: "trigger";

  extensionPoint: {
    metadata: Metadata;
    definition: {
      rootSelector: string | null;
      trigger: Trigger;
      reader: SingleLayerReaderConfig;
      isAvailable: NormalizedAvailability;
    };
  };
}

function fromNativeElement(
  url: string,
  metadata: Metadata,
  _element: null
): TriggerFormState {
  return {
    type: "trigger",
    label: `My ${getDomain(url)} trigger`,
    ...makeInitialBaseState(),
    extensionPoint: {
      metadata,
      definition: {
        rootSelector: null,
        trigger: "load",
        reader: getImplicitReader("trigger"),
        isAvailable: makeIsAvailable(url),
      },
    },
    extension: {
      pipelineBlocks: {},
      pipelineOrder: [],
    },
  };
}

function selectExtensionPoint(
  formState: TriggerFormState
): ExtensionPointConfig<TriggerDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: { isAvailable, rootSelector, reader, trigger },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "trigger",
      reader,
      isAvailable: pickBy(isAvailable, identity),
      trigger,
      rootSelector,
    },
  });
}

function selectExtension(
  {
    uuid,
    apiVersion,
    label,
    extensionPoint,
    extension,
    services,
  }: TriggerFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<TriggerConfig> {
  const config: TriggerConfig = {
    action: pipelineFromExtension(extension),
  };
  return removeEmptyValues({
    id: uuid,
    apiVersion,
    extensionPointId: extensionPoint.metadata.id,
    _recipe: null,
    label,
    services,
    config: options.includeInstanceIds
      ? config
      : excludeInstanceIds(config, "action"),
  });
}

function asDynamicElement(element: TriggerFormState): DynamicDefinition {
  return {
    type: "trigger",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPoint: selectExtensionPoint(element),
  };
}

async function fromExtensionPoint(
  url: string,
  extensionPoint: ExtensionPointConfig<TriggerDefinition>
): Promise<TriggerFormState> {
  if (extensionPoint.definition.type !== "trigger") {
    throw new Error("Expected trigger extension point type");
  }

  const {
    type,
    rootSelector,
    reader,
    trigger = "load",
  } = extensionPoint.definition;

  return {
    uuid: uuidv4(),
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    installed: true,
    type,
    label: `My ${getDomain(url)} ${trigger} trigger`,

    services: [],

    extension: {
      pipelineBlocks: {},
      pipelineOrder: [],
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        rootSelector,
        trigger,
        reader: readerTypeHack(reader),
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

  const { rootSelector, trigger, reader } = extensionPoint.definition;

  const [pipelineBlocks, pipelineOrder] = withInstanceIds(
    castArray(config.config.action)
  );

  return {
    uuid: config.id,
    apiVersion: config.apiVersion,
    installed: true,
    type: extensionPoint.definition.type,
    label: config.label,

    services: config.services,

    extension: {
      pipelineBlocks,
      pipelineOrder,
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        rootSelector,
        trigger,
        reader: readerTypeHack(reader),
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
  EditorNode: TriggerConfiguration,
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
        Search for an existing trigger in the marketplace, or start from scratch
        to have full control over when the trigger runs.
      </p>
    </div>
  ),
};

export default config;
