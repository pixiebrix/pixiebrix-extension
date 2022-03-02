/* eslint-disable filenames/match-exported */
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
  extensionWithNormalizedPipeline,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  omitEditorMetadata,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  readerTypeHack,
  removeEmptyValues,
  selectIsAvailable,
} from "@/pageEditor/extensionPoints/base";
import { uuidv4 } from "@/types/helpers";
import {
  AttachMode,
  TargetMode,
  Trigger,
  TriggerConfig,
  TriggerDefinition,
  TriggerExtensionPoint,
} from "@/extensionPoints/triggerExtension";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { identity, pickBy } from "lodash";
import { getDomain } from "@/permissions/patterns";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import {
  BaseFormState,
  ElementConfig,
  SingleLayerReaderConfig,
} from "@/pageEditor/extensionPoints/elementConfig";
import { NormalizedAvailability } from "@/blocks/types";
import React from "react";
import TriggerConfiguration from "@/pageEditor/tabs/trigger/TriggerConfiguration";
import type { DynamicDefinition } from "@/contentScript/nativeEditor/types";

export interface TriggerFormState extends BaseFormState {
  type: "trigger";

  extensionPoint: {
    metadata: Metadata;
    definition: {
      rootSelector: string | null;
      trigger: Trigger;
      reader: SingleLayerReaderConfig;
      attachMode: AttachMode;
      targetMode: TargetMode;

      isAvailable: NormalizedAvailability;

      // Interval props
      intervalMillis: number | null;
      background: boolean | null;
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
        trigger: "load",
        rootSelector: null,
        attachMode: null,
        targetMode: null,
        intervalMillis: null,
        background: null,
        reader: getImplicitReader("trigger"),
        isAvailable: makeIsAvailable(url),
      },
    },
    extension: {
      blockPipeline: [],
    },
  };
}

function selectExtensionPoint(
  formState: TriggerFormState
): ExtensionPointConfig<TriggerDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: {
      isAvailable,
      rootSelector,
      attachMode,
      targetMode,
      intervalMillis,
      background,
      reader,
      trigger,
    },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "trigger",
      reader,
      isAvailable: pickBy(isAvailable, identity),
      trigger,
      intervalMillis,
      background,
      attachMode,
      targetMode,
      rootSelector,
    },
  });
}

function selectExtension(
  state: TriggerFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<TriggerConfig> {
  const { extension } = state;
  const config: TriggerConfig = {
    action: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
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
    attachMode,
    targetMode,
    reader,
    intervalMillis,
    trigger = "load",
  } = extensionPoint.definition;

  return {
    uuid: uuidv4(),
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    installed: true,
    type,
    label: `My ${getDomain(url)} ${trigger} trigger`,

    services: [],

    optionsArgs: {},

    extension: {
      blockPipeline: [],
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        rootSelector,
        attachMode,
        targetMode,
        trigger,
        intervalMillis,
        reader: readerTypeHack(reader),
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
    recipe: undefined,
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

  const {
    rootSelector,
    attachMode,
    targetMode,
    trigger,
    reader,
    background,
    intervalMillis,
  } = extensionPoint.definition;

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = extensionWithNormalizedPipeline(config.config, "action");

  return {
    ...base,

    extension,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        rootSelector,
        trigger,
        attachMode,
        targetMode,
        background,
        intervalMillis,
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
  InsertModeHelpText: () => (
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
