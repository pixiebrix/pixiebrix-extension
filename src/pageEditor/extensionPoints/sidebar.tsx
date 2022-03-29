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
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  extensionWithNormalizedPipeline,
  omitEditorMetadata,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  readerTypeHack,
  removeEmptyValues,
  selectIsAvailable,
} from "@/pageEditor/extensionPoints/base";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import {
  SidebarConfig,
  SidebarExtensionPoint,
  PanelDefinition,
} from "@/extensionPoints/sidebarExtension";
import { uuidv4 } from "@/types/helpers";
import { getDomain } from "@/permissions/patterns";
import { faColumns } from "@fortawesome/free-solid-svg-icons";
import Configuration from "@/pageEditor/tabs/sidebar/Configuration";
import { ElementConfig } from "@/pageEditor/extensionPoints/elementConfig";
import React from "react";
import type { DynamicDefinition } from "@/contentScript/nativeEditor/types";
import { SidebarFormState } from "./formStateTypes";

function fromNativeElement(url: string, metadata: Metadata): SidebarFormState {
  const base = makeInitialBaseState();

  const heading = `${getDomain(url)} side panel`;

  return {
    type: "actionPanel",
    label: heading,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        type: "actionPanel",
        isAvailable: makeIsAvailable(url),
        reader: getImplicitReader("actionPanel"),
      },
    },
    extension: {
      heading,
      blockPipeline: [],
    },
  };
}

function selectExtensionPoint(
  formState: SidebarFormState
): ExtensionPointConfig {
  const { extensionPoint } = formState;
  const {
    definition: { isAvailable, reader },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "actionPanel",
      reader,
      isAvailable,
    },
  });
}

function selectExtension(
  state: SidebarFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<SidebarConfig> {
  const { extension } = state;
  const config: SidebarConfig = {
    heading: extension.heading,
    body: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
  });
}

function asDynamicElement(element: SidebarFormState): DynamicDefinition {
  return {
    type: "actionPanel",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPoint: selectExtensionPoint(element),
  };
}

export async function fromExtensionPoint(
  url: string,
  extensionPoint: ExtensionPointConfig
): Promise<SidebarFormState> {
  if (extensionPoint.definition.type !== "actionPanel") {
    throw new Error("Expected actionPanel extension point type");
  }

  const heading = `${getDomain(url)} side panel`;

  return {
    uuid: uuidv4(),
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    installed: true,
    type: extensionPoint.definition.type,
    label: heading,

    services: [],

    optionsArgs: {},

    extension: {
      heading,
      blockPipeline: [],
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        reader: readerTypeHack(extensionPoint.definition.reader),
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
    recipe: undefined,
  };
}

async function fromExtension(
  config: IExtension<SidebarConfig>
): Promise<SidebarFormState> {
  const extensionPoint = await lookupExtensionPoint<
    PanelDefinition,
    SidebarConfig,
    "actionPanel"
  >(config, "actionPanel");

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = extensionWithNormalizedPipeline(config.config, "body");

  return {
    ...base,

    extension,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        reader: readerTypeHack(extensionPoint.definition.reader),
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

const config: ElementConfig<never, SidebarFormState> = {
  displayOrder: 3,
  elementType: "actionPanel",
  label: "Sidebar Panel",
  baseClass: SidebarExtensionPoint,
  selectNativeElement: undefined,
  icon: faColumns,
  fromNativeElement,
  asDynamicElement,
  fromExtensionPoint,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
  EditorNode: Configuration,
  InsertModeHelpText: () => (
    <div>
      <p>
        A sidebar panel can be configured to appear in the PixieBrix sidebar on
        pages you choose.
      </p>

      <p>
        Search for an existing sidebar panel in the marketplace, or start from
        scratch to have full control over when the panel appears.
      </p>
    </div>
  ),
};

export default config;
