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
import { type IExtension } from "@/types/extensionTypes";
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
  removeEmptyValues,
  selectIsAvailable,
} from "@/pageEditor/extensionPoints/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { faPlusSquare } from "@fortawesome/free-solid-svg-icons";
import {
  type ElementConfig,
  type SingleLayerReaderConfig,
} from "@/pageEditor/extensionPoints/elementConfig";
import type { DynamicDefinition } from "@/contentScript/pageEditor/types";
import { type QuickBarProviderFormState } from "./formStateTypes";
import {
  type QuickBarProviderConfig,
  type QuickBarProviderDefinition,
  QuickBarProviderExtensionPoint,
} from "@/extensionPoints/quickBarProviderExtension";
import QuickBarProviderConfiguration from "@/pageEditor/tabs/quickBarProvider/QuickBarProviderConfiguration";

function fromNativeElement(
  url: string,
  metadata: Metadata
): QuickBarProviderFormState {
  const base = makeInitialBaseState();

  const isAvailable = makeIsAvailable(url);

  const title = "Dynamic Quick Bar";

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

function asDynamicElement(
  element: QuickBarProviderFormState
): DynamicDefinition {
  return {
    type: "quickBarProvider",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPointConfig: selectExtensionPointConfig(element),
  };
}

const config: ElementConfig<undefined, QuickBarProviderFormState> = {
  displayOrder: 1,
  elementType: "quickBarProvider",
  label: "Dynamic Quick Bar",
  baseClass: QuickBarProviderExtensionPoint,
  EditorNode: QuickBarProviderConfiguration,
  selectNativeElement: undefined,
  icon: faPlusSquare,
  flag: "pageeditor-quickbar-provider",
  fromNativeElement,
  asDynamicElement,
  selectExtensionPointConfig,
  selectExtension,
  fromExtension,
};

export default config;
