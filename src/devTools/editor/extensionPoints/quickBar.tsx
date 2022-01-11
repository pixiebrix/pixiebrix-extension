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

/* eslint-disable filenames/match-exported */
import { IExtension, Metadata } from "@/core";
import {
  baseFromExtension,
  baseSelectExtension,
  baseSelectExtensionPoint,
  cleanIsAvailable,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  extensionWithNormalizedPipeline,
  omitEditorMetadata,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  removeEmptyValues,
  selectIsAvailable,
} from "@/devTools/editor/extensionPoints/base";
import { uuidv4 } from "@/types/helpers";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { getDomain } from "@/permissions/patterns";
import { faThLarge } from "@fortawesome/free-solid-svg-icons";
import {
  BaseExtensionState,
  BaseFormState,
  ElementConfig,
  SingleLayerReaderConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { Menus } from "webextension-polyfill";
import { NormalizedAvailability } from "@/blocks/types";
import React from "react";
import { Except } from "type-fest";
import {
  QuickBarConfig,
  QuickBarDefaultOptions,
  QuickBarDefinition,
  QuickBarExtensionPoint,
  QuickBarTargetMode,
} from "@/extensionPoints/quickBarExtension";
import QuickBarConfiguration from "@/devTools/editor/tabs/quickBar/QuickBarConfiguration";
import { upgradePipelineToV3 } from "@/devTools/editor/extensionPoints/upgrade";
import store from "@/devTools/store";
import { actions } from "@/devTools/editor/slices/editorSlice";

type Extension = BaseExtensionState & Except<QuickBarConfig, "action">;

export interface QuickBarFormState extends BaseFormState<Extension> {
  type: "quickBar";

  extensionPoint: {
    metadata: Metadata;
    definition: {
      defaultOptions: QuickBarDefaultOptions;
      documentUrlPatterns: string[];
      contexts: Menus.ContextType[];
      targetMode: QuickBarTargetMode;
      reader: SingleLayerReaderConfig;
      isAvailable: NormalizedAvailability;
    };
  };
}

function fromNativeElement(url: string, metadata: Metadata): QuickBarFormState {
  const base = makeInitialBaseState();

  const isAvailable = makeIsAvailable(url);

  const title = "Quick bar item";

  return {
    type: "quickBar",
    // To simplify the interface, this is kept in sync with the caption
    label: title,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        reader: getImplicitReader("quickBar"),
        documentUrlPatterns: isAvailable.matchPatterns,
        contexts: ["all"],
        targetMode: "eventTarget",
        defaultOptions: {},
        isAvailable,
      },
    },
    extension: {
      title,
      blockPipeline: [],
    },
  };
}

function selectExtensionPoint(
  formState: QuickBarFormState
): ExtensionPointConfig<QuickBarDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: {
      isAvailable,
      documentUrlPatterns,
      reader,
      targetMode,
      contexts = ["all"],
    },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "quickBar",
      documentUrlPatterns,
      contexts,
      targetMode,
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
    },
  });
}

function selectExtension(
  { extension, ...state }: QuickBarFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<QuickBarConfig> {
  const config: QuickBarConfig = {
    title: extension.title,
    icon: extension.icon,
    action: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
  });
}

async function fromExtension(
  config: IExtension<QuickBarConfig>
): Promise<QuickBarFormState> {
  const extensionPoint = await lookupExtensionPoint<
    QuickBarDefinition,
    QuickBarConfig,
    "quickBar"
  >(config, "quickBar");

  const {
    documentUrlPatterns,
    defaultOptions,
    contexts,
    targetMode,
    reader,
  } = extensionPoint.definition;

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = extensionWithNormalizedPipeline(config.config, "action");
  let showV3UpgradeMessage = false;
  let { apiVersion, uuid } = base;

  if (apiVersion === "v2") {
    extension.blockPipeline = await upgradePipelineToV3(
      extension.blockPipeline
    );
    showV3UpgradeMessage = true;
    apiVersion = "v3";
    store.dispatch(actions.markElementDirty(uuid));
  }

  return {
    ...base,

    apiVersion,
    showV3UpgradeMessage,

    extension,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        documentUrlPatterns,
        defaultOptions,
        targetMode,
        contexts,
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

async function fromExtensionPoint(
  url: string,
  extensionPoint: ExtensionPointConfig<QuickBarDefinition>
): Promise<QuickBarFormState> {
  if (extensionPoint.definition.type !== "quickBar") {
    throw new Error("Expected quickBar extension point type");
  }

  const {
    defaultOptions = {},
    documentUrlPatterns = [],
    targetMode = "eventTarget",
    type,
    reader,
  } = extensionPoint.definition;

  return {
    uuid: uuidv4(),
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    showV3UpgradeMessage: false,
    installed: true,
    type,
    label: `My ${getDomain(url)} quick bar item`,

    services: [],
    optionsArgs: {},

    extension: {
      title: defaultOptions.title ?? "Custom Action",
      blockPipeline: [],
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        defaultOptions,
        documentUrlPatterns,
        targetMode,
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },

    recipe: undefined,
  };
}

function asDynamicElement(element: QuickBarFormState): DynamicDefinition {
  return {
    type: "quickBar",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPoint: selectExtensionPoint(element),
  };
}

const config: ElementConfig<undefined, QuickBarFormState> = {
  displayOrder: 1,
  elementType: "quickBar",
  label: "Quick Bar",
  beta: true,
  baseClass: QuickBarExtensionPoint,
  EditorNode: QuickBarConfiguration,
  selectNativeElement: undefined,
  icon: faThLarge,
  fromNativeElement,
  fromExtensionPoint,
  asDynamicElement,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
  insertModeHelp: (
    <div>
      <p>The quick bar can be triggered on any page by hitting cmd+k</p>
    </div>
  ),
};

export default config;
