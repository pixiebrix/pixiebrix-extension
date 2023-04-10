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

import { type Metadata } from "@/types/registryTypes";
import {
  baseFromExtension,
  baseSelectExtension,
  baseSelectExtensionPoint,
  extensionWithNormalizedPipeline,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  readerTypeHack,
  removeEmptyValues,
  selectIsAvailable,
} from "@/pageEditor/extensionPoints/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { identity, pickBy } from "lodash";
import { getDomain } from "@/permissions/patterns";
import { faMapSigns } from "@fortawesome/free-solid-svg-icons";
import { type ElementConfig } from "@/pageEditor/extensionPoints/elementConfig";
import type { DynamicDefinition } from "@/contentScript/pageEditor/types";
import { type TourFormState } from "./formStateTypes";
import {
  type TourConfig,
  type TourDefinition,
  TourExtensionPoint,
} from "@/extensionPoints/tourExtension";
import TourConfiguration from "@/pageEditor/tabs/tour/TourConfiguration";
import { type IExtension } from "@/types/extensionTypes";

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
        allowUserRun: true,
        autoRunSchedule: "never",
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
        ...extensionPoint.definition,
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
  baseClass: TourExtensionPoint,
  flag: "pageeditor-tour",
  EditorNode: TourConfiguration,
  selectNativeElement: undefined,
  icon: faMapSigns,
  fromNativeElement,
  asDynamicElement,
  selectExtensionPointConfig,
  selectExtension,
  fromExtension,
};

export default config;
