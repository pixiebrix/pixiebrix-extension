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
import { ExtensionPointConfig } from "@/extensionPoints/types";
import {
  ContextMenuConfig,
  ContextMenuExtensionPoint,
  ContextMenuTargetMode,
  MenuDefaultOptions as ContextMenuDefaultOptions,
  MenuDefinition,
} from "@/extensionPoints/contextMenu";
import { getDomain } from "@/permissions/patterns";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import {
  BaseExtensionState,
  BaseFormState,
  ElementConfig,
  SingleLayerReaderConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { Menus } from "webextension-polyfill";
import { NormalizedAvailability } from "@/blocks/types";
import React from "react";
import ContextMenuConfiguration from "@/devTools/editor/tabs/contextMenu/ContextMenuConfiguration";
import { Except } from "type-fest";
import type { DynamicDefinition } from "@/contentScript/nativeEditor/types";

type Extension = BaseExtensionState & Except<ContextMenuConfig, "action">;

export interface ContextMenuFormState extends BaseFormState<Extension> {
  type: "contextMenu";

  extensionPoint: {
    metadata: Metadata;
    definition: {
      defaultOptions: ContextMenuDefaultOptions;
      documentUrlPatterns: string[];
      contexts: Menus.ContextType[];
      targetMode: ContextMenuTargetMode;
      reader: SingleLayerReaderConfig;
      isAvailable: NormalizedAvailability;
    };
  };
}

function fromNativeElement(
  url: string,
  metadata: Metadata
): ContextMenuFormState {
  const base = makeInitialBaseState();

  const isAvailable = makeIsAvailable(url);

  const title = "Context menu item";

  return {
    type: "contextMenu",
    // To simplify the interface, this is kept in sync with the caption
    label: title,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        reader: getImplicitReader("contextMenu"),
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
  formState: ContextMenuFormState
): ExtensionPointConfig<MenuDefinition> {
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
      type: "contextMenu",
      documentUrlPatterns,
      contexts,
      targetMode,
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
    },
  });
}

function selectExtension(
  { extension, ...state }: ContextMenuFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<ContextMenuConfig> {
  const config: ContextMenuConfig = {
    title: extension.title,
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
  config: IExtension<ContextMenuConfig>
): Promise<ContextMenuFormState> {
  const extensionPoint = await lookupExtensionPoint<
    MenuDefinition,
    ContextMenuConfig,
    "contextMenu"
  >(config, "contextMenu");
  const { documentUrlPatterns, defaultOptions, contexts, targetMode, reader } =
    extensionPoint.definition;

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = extensionWithNormalizedPipeline(config.config, "action");

  return {
    ...base,

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
  extensionPoint: ExtensionPointConfig<MenuDefinition>
): Promise<ContextMenuFormState> {
  if (extensionPoint.definition.type !== "contextMenu") {
    throw new Error("Expected contextMenu extension point type");
  }

  const {
    defaultOptions = {},
    documentUrlPatterns = [],
    targetMode = "legacy",
    type,
    reader,
  } = extensionPoint.definition;

  return {
    uuid: uuidv4(),
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    installed: true,
    type,
    label: `My ${getDomain(url)} context menu`,

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

function asDynamicElement(element: ContextMenuFormState): DynamicDefinition {
  return {
    type: "contextMenu",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPoint: selectExtensionPoint(element),
  };
}

const config: ElementConfig<undefined, ContextMenuFormState> = {
  displayOrder: 1,
  elementType: "contextMenu",
  label: "Context Menu",
  baseClass: ContextMenuExtensionPoint,
  EditorNode: ContextMenuConfiguration,
  selectNativeElement: undefined,
  icon: faBars,
  fromNativeElement,
  fromExtensionPoint,
  asDynamicElement,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
  InsertModeHelpText: () => (
    <div>
      <p>
        A context menu (also called a right-click menu) can be configured to
        appear when you right click on a page, text selection, or other content.
      </p>

      <p>
        Search for an existing context menu in the marketplace, or start from
        scratch to have full control over how your context menu appears.
      </p>
    </div>
  ),
};

export default config;
