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

import { type IExtension, type Metadata } from "@/core";
import {
  baseFromExtension,
  baseSelectExtension,
  baseSelectExtensionPoint,
  cleanIsAvailable,
  extensionWithNormalizedPipeline,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  removeEmptyValues,
  selectIsAvailable,
} from "@/pageEditor/extensionPoints/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { uuidv4 } from "@/types/helpers";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { getDomain } from "@/permissions/patterns";
import { faPlusSquare } from "@fortawesome/free-solid-svg-icons";
import {
  type ElementConfig,
  type SingleLayerReaderConfig,
} from "@/pageEditor/extensionPoints/elementConfig";
import type { DynamicDefinition } from "@/contentScript/pageEditor/types";
import { type QuickBarProviderFormState } from "./formStateTypes";
import { makeEmptyPermissions } from "@/utils/permissions";
import {
  type QuickBarProviderConfig,
  type QuickBarProviderDefinition,
  QuickBarProviderExtensionPoint,
} from "@/extensionPoints/quickBarProviderExtension";
import { InsertModeHelpText } from "@/pageEditor/extensionPoints/quickBar";
import QuickBarProviderConfiguration from "@/pageEditor/tabs/quickBarProvider/QuickBarProviderConfiguration";

function fromNativeElement(
  url: string,
  metadata: Metadata
): QuickBarProviderFormState {
  const base = makeInitialBaseState();

  const isAvailable = makeIsAvailable(url);

  const title = "Quick Bar Action Provider";

  return {
    type: "quickBarProvider",
    // To simplify the interface, this is kept in sync with the caption
    label: title,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        type: "quickBarProvider",
        reader: getImplicitReader("quickBarProvider"),
        documentUrlPatterns: isAvailable.matchPatterns,
        defaultOptions: {},
        isAvailable,
      },
    },
    extension: {
      rootAction: undefined,
      blockPipeline: [],
    },
  };
}

function selectExtensionPointConfig(
  formState: QuickBarProviderFormState
): ExtensionPointConfig<QuickBarProviderDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: { isAvailable, documentUrlPatterns, reader },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "quickBarProvider",
      documentUrlPatterns,
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
    },
  });
}

function selectExtension(
  state: QuickBarProviderFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<QuickBarProviderConfig> {
  const { extension } = state;
  const config: QuickBarProviderConfig = {
    rootAction: extension.rootAction,
    generator: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
  });
}

async function fromExtension(
  config: IExtension<QuickBarProviderConfig>
): Promise<QuickBarProviderFormState> {
  const extensionPoint = await lookupExtensionPoint<
    QuickBarProviderDefinition,
    QuickBarProviderConfig,
    "quickBarProvider"
  >(config, "quickBarProvider");

  const { documentUrlPatterns, defaultOptions, reader } =
    extensionPoint.definition;

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = await extensionWithNormalizedPipeline(
    config.config,
    "generator"
  );

  return {
    ...base,

    extension,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        type: "quickBarProvider",
        documentUrlPatterns,
        defaultOptions,
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

async function fromExtensionPoint(
  url: string,
  extensionPoint: ExtensionPointConfig<QuickBarProviderDefinition>
): Promise<QuickBarProviderFormState> {
  if (extensionPoint.definition.type !== "quickBarProvider") {
    throw new Error("Expected quickBar extension point type");
  }

  const {
    defaultOptions = {},
    documentUrlPatterns = [],
    type,
    reader,
  } = extensionPoint.definition;

  return {
    uuid: uuidv4(),
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    installed: true,
    type,
    label: `My ${getDomain(url)} quick bar item`,

    services: [],
    permissions: makeEmptyPermissions(),
    optionsArgs: {},

    extension: {
      rootAction: undefined,
      blockPipeline: [],
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        defaultOptions,
        documentUrlPatterns,
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },

    recipe: undefined,
  };
}

function asDynamicElement(
  element: QuickBarProviderFormState
): DynamicDefinition {
  return {
    type: "quickBar",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPointConfig: selectExtensionPointConfig(element),
  };
}

const config: ElementConfig<undefined, QuickBarProviderFormState> = {
  displayOrder: 1,
  elementType: "quickBarProvider",
  label: "Quick Bar Provider",
  baseClass: QuickBarProviderExtensionPoint,
  EditorNode: QuickBarProviderConfiguration,
  selectNativeElement: undefined,
  icon: faPlusSquare,
  flag: "pageeditor-quickbar-provider",
  fromNativeElement,
  fromExtensionPoint,
  asDynamicElement,
  selectExtensionPointConfig,
  selectExtension,
  fromExtension,
  InsertModeHelpText,
};

export default config;
