/* eslint-disable filenames/match-exported */
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
import {
  type PanelDefinition,
  type SidebarConfig,
  SidebarExtensionPoint,
} from "@/extensionPoints/sidebarExtension";
import { getDomain } from "@/permissions/patterns";
import { faColumns } from "@fortawesome/free-solid-svg-icons";
import SidebarConfiguration from "@/pageEditor/tabs/sidebar/SidebarConfiguration";
import { type ElementConfig } from "@/pageEditor/extensionPoints/elementConfig";
import React from "react";
import type { DynamicDefinition } from "@/contentScript/pageEditor/types";
import { type SidebarFormState } from "./formStateTypes";

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

        trigger: "load",

        debounce: {
          waitMillis: 250,
          leading: false,
          trailing: true,
        },

        customEvent: null,
      },
    },
    extension: {
      heading,
      blockPipeline: [],
    },
  };
}

function selectExtensionPointConfig(
  formState: SidebarFormState
): ExtensionPointConfig {
  const { extensionPoint } = formState;
  const {
    definition: { isAvailable, reader, trigger, debounce, customEvent },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "actionPanel",
      reader,
      isAvailable,
      trigger,
      debounce,
      customEvent,
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
    extensionPointConfig: selectExtensionPointConfig(element),
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
  const extension = await extensionWithNormalizedPipeline(
    config.config,
    "body"
  );

  const {
    trigger = "load",
    debounce,
    customEvent,
    reader,
  } = extensionPoint.definition;

  return {
    ...base,

    extension,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        trigger,
        debounce,
        customEvent,
        reader: readerTypeHack(reader),
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
  selectExtensionPointConfig,
  selectExtension,
  fromExtension,
  EditorNode: SidebarConfiguration,
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
