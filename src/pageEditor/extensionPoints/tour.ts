/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

/* eslint-disable filenames/match-exported */
import { type IExtension, type Metadata } from "@/core";
import {
  baseFromExtension,
  baseSelectExtension,
  baseSelectExtensionPoint,
  extensionWithNormalizedPipeline,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  readerTypeHack,
  removeEmptyValues,
  selectIsAvailable,
} from "@/pageEditor/extensionPoints/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { uuidv4 } from "@/types/helpers";
import { TriggerExtensionPoint } from "@/extensionPoints/triggerExtension";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { identity, pickBy } from "lodash";
import { getDomain } from "@/permissions/patterns";
import { faMapSigns } from "@fortawesome/free-solid-svg-icons";
import { type ElementConfig } from "@/pageEditor/extensionPoints/elementConfig";
import TriggerConfiguration from "@/pageEditor/tabs/trigger/TriggerConfiguration";
import type { DynamicDefinition } from "@/contentScript/pageEditor/types";
import { type TourFormState } from "./formStateTypes";
import { makeEmptyPermissions } from "@/utils/permissions";
import {
  type TourConfig,
  type TourDefinition,
} from "@/extensionPoints/tourExtension";

function fromNativeElement(
  url: string,
  metadata: Metadata,
  _element: null
): TourFormState {
  return {
    type: "tour",
    label: `My ${getDomain(url)} tour`,
    ...makeInitialBaseState(),
    extensionPoint: {
      metadata,
      definition: {
        type: "tour",
        reader: getImplicitReader("tour"),
        isAvailable: makeIsAvailable(url),
      },
    },
    extension: {
      blockPipeline: [],
    },
  };
}

function selectExtensionPointConfig(
  formState: TourFormState
): ExtensionPointConfig<TourDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: { isAvailable, reader },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "tour",
      reader,
      isAvailable: pickBy(isAvailable, identity),
    },
  });
}

function selectExtension(
  state: TourFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<TourConfig> {
  const { extension } = state;
  const config: TourConfig = {
    tour: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
  });
}

function asDynamicElement(element: TourFormState): DynamicDefinition {
  return {
    type: "tour",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPointConfig: selectExtensionPointConfig(element),
  };
}

async function fromExtensionPoint(
  url: string,
  extensionPoint: ExtensionPointConfig<TourDefinition>
): Promise<TourFormState> {
  if (extensionPoint.definition.type !== "tour") {
    throw new Error("Expected tour extension point type");
  }

  const { type, reader } = extensionPoint.definition;

  return {
    uuid: uuidv4(),
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    installed: true,
    type,
    label: `My ${getDomain(url)} tour`,

    services: [],
    permissions: makeEmptyPermissions(),

    optionsArgs: {},

    extension: {
      blockPipeline: [],
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        reader: readerTypeHack(reader),
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
    recipe: undefined,
  };
}

async function fromExtension(
  config: IExtension<TourConfig>
): Promise<TourFormState> {
  const extensionPoint = await lookupExtensionPoint<
    TourDefinition,
    TourConfig,
    "tour"
  >(config, "tour");

  const { reader } = extensionPoint.definition;

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = await extensionWithNormalizedPipeline(
    config.config,
    "tour"
  );

  return {
    ...base,

    extension,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        type: extensionPoint.definition.type,
        reader: readerTypeHack(reader),
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

const config: ElementConfig<undefined, TourFormState> = {
  displayOrder: 8,
  elementType: "tour",
  label: "Tour",
  baseClass: TriggerExtensionPoint,
  EditorNode: TriggerConfiguration,
  selectNativeElement: undefined,
  icon: faMapSigns,
  fromNativeElement,
  asDynamicElement,
  selectExtensionPointConfig,
  selectExtension,
  fromExtension,
  fromExtensionPoint,
};

export default config;
