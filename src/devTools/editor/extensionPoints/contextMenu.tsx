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
  removeEmptyValues,
  selectIsAvailable,
  withInstanceIds,
  WizardStep,
} from "@/devTools/editor/extensionPoints/base";
import { uuidv4 } from "@/types/helpers";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray } from "lodash";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import {
  ContextMenuConfig,
  ContextMenuExtensionPoint,
  MenuDefaultOptions as ContextMenuDefaultOptions,
  MenuDefinition,
} from "@/extensionPoints/contextMenu";
import { getDomain } from "@/permissions/patterns";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import {
  BaseFormState,
  ElementConfig,
  SingleLayerReaderConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { Menus } from "webextension-polyfill-ts";
import { BlockPipeline, NormalizedAvailability } from "@/blocks/types";
import React from "react";
import EditTab from "@/devTools/editor/tabs/editTab/EditTab";
import ContextMenuConfiguration from "@/devTools/editor/tabs/contextMenu/ContextMenuConfiguration";

const wizard: WizardStep[] = [
  { step: "Edit", Component: EditTab },
  { step: "Logs", Component: LogsTab },
];

export interface ContextMenuFormState extends BaseFormState {
  type: "contextMenu";

  extensionPoint: {
    metadata: Metadata;
    definition: {
      defaultOptions: ContextMenuDefaultOptions;
      documentUrlPatterns: string[];
      contexts: Menus.ContextType[];
      reader: SingleLayerReaderConfig;
      isAvailable: NormalizedAvailability;
    };
  };

  extension: {
    title: string;
    blockPipeline: BlockPipeline;
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
      contexts = ["all"],
    },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "contextMenu",
      documentUrlPatterns,
      contexts,
      reader,
      isAvailable,
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
  }: ContextMenuFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<ContextMenuConfig> {
  const config: ContextMenuConfig = {
    title: extension.title,
    action: extension.blockPipeline,
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

async function fromExtension(
  config: IExtension<ContextMenuConfig>
): Promise<ContextMenuFormState> {
  const extensionPoint = await lookupExtensionPoint<
    MenuDefinition,
    ContextMenuConfig,
    "contextMenu"
  >(config, "contextMenu");
  const extensionConfig = config.config;

  const {
    documentUrlPatterns,
    defaultOptions,
    contexts,
    reader,
  } = extensionPoint.definition;

  const blockPipeline = withInstanceIds(castArray(extensionConfig.action));

  return {
    uuid: config.id,
    apiVersion: config.apiVersion,
    installed: true,
    type: "contextMenu",
    label: config.label,

    services: config.services,

    extension: {
      ...extensionConfig,
      blockPipeline,
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        documentUrlPatterns,
        defaultOptions,
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
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
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
  wizard,
  insertModeHelp: (
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
