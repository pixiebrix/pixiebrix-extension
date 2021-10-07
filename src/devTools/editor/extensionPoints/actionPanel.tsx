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

import { IExtension, Metadata, UUID } from "@/core";
import {
  baseSelectExtensionPoint,
  excludeInstanceIds,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  pipelineFromExtension,
  readerTypeHack,
  removeEmptyValues,
  selectIsAvailable,
  withInstanceIds,
  WizardStep,
} from "@/devTools/editor/extensionPoints/base";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray } from "lodash";
import {
  ActionPanelConfig,
  ActionPanelExtensionPoint,
  PanelDefinition,
} from "@/extensionPoints/actionPanelExtension";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import { uuidv4 } from "@/types/helpers";
import { getDomain } from "@/permissions/patterns";
import { faColumns } from "@fortawesome/free-solid-svg-icons";
import ActionPanelConfiguration from "@/devTools/editor/tabs/actionPanel/ActionPanelConfiguration";
import {
  BaseFormState,
  ElementConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import React from "react";
import EditTab from "@/devTools/editor/tabs/editTab/EditTab";
import { BlockConfig } from "@/blocks/types";

const wizard: WizardStep[] = [
  { step: "Edit", Component: EditTab },
  { step: "Logs", Component: LogsTab },
];

export interface ActionPanelFormState extends BaseFormState {
  type: "actionPanel";

  extension: {
    heading: string;
    pipelineBlocks: Record<UUID, BlockConfig>;
    pipelineOrder: UUID[];
  };
}

function fromNativeElement(
  url: string,
  metadata: Metadata
): ActionPanelFormState {
  const base = makeInitialBaseState();

  const heading = `${getDomain(url)} side panel`;

  return {
    type: "actionPanel",
    label: heading,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        isAvailable: makeIsAvailable(url),
        reader: getImplicitReader("actionPanel"),
      },
    },
    extension: {
      heading,
      pipelineBlocks: {},
      pipelineOrder: [],
    },
  };
}

function selectExtensionPoint(
  formState: ActionPanelFormState
): ExtensionPointConfig<PanelDefinition> {
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
  {
    uuid,
    label,
    extensionPoint,
    extension,
    services,
    apiVersion,
  }: ActionPanelFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<ActionPanelConfig> {
  const config: ActionPanelConfig = {
    heading: extension.heading,
    body: pipelineFromExtension(extension),
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
      : excludeInstanceIds(config, "body"),
  });
}

function asDynamicElement(element: ActionPanelFormState): DynamicDefinition {
  return {
    type: "actionPanel",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPoint: selectExtensionPoint(element),
  };
}

export async function fromExtensionPoint(
  url: string,
  extensionPoint: ExtensionPointConfig<PanelDefinition>
): Promise<ActionPanelFormState> {
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

    extension: {
      heading,
      pipelineBlocks: {},
      pipelineOrder: [],
    },

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

async function fromExtension(
  config: IExtension<ActionPanelConfig>
): Promise<ActionPanelFormState> {
  const extensionPoint = await lookupExtensionPoint<
    PanelDefinition,
    ActionPanelConfig,
    "actionPanel"
  >(config, "actionPanel");

  const [pipelineBlocks, pipelineOrder] = withInstanceIds(
    castArray(config.config.body)
  );

  return {
    uuid: config.id,
    apiVersion: config.apiVersion,
    installed: true,
    type: extensionPoint.definition.type,
    label: config.label,

    services: config.services,

    extension: {
      heading: config.config.heading,
      pipelineBlocks,
      pipelineOrder,
    },

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

const config: ElementConfig<never, ActionPanelFormState> = {
  displayOrder: 3,
  elementType: "actionPanel",
  label: "Sidebar Panel",
  baseClass: ActionPanelExtensionPoint,
  selectNativeElement: undefined,
  icon: faColumns,
  fromNativeElement,
  asDynamicElement,
  fromExtensionPoint,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
  wizard,
  EditorNode: ActionPanelConfiguration,
  insertModeHelp: (
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
