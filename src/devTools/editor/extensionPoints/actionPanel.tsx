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
  lookupExtensionPoint,
  makeBaseState,
  makeExtensionReaders,
  makeIsAvailable,
  makeReaderFormState,
  removeEmptyValues,
  selectIsAvailable,
  withInstanceIds,
  WizardStep,
} from "@/devTools/editor/extensionPoints/base";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { castArray, identity, pickBy } from "lodash";
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
import { BlockPipeline } from "@/blocks/types";
import EditTab from "@/devTools/editor/tabs/editTab/EditTab";

const wizard: WizardStep[] = [
  {
    step: "Edit",
    Component: EditTab,
    extraProps: { pipelineFieldName: "extension.body" },
  },
  { step: "Logs", Component: LogsTab },
];

export interface ActionPanelFormState extends BaseFormState {
  type: "actionPanel";

  extensionPoint: {
    metadata: Metadata;
    definition: {
      isAvailable: {
        matchPatterns: string;
        selectors: string;
      };
    };
  };

  extension: {
    heading: string;
    body: BlockPipeline;
  };
}

function fromNativeElement(
  url: string,
  metadata: Metadata
): ActionPanelFormState {
  const base = makeBaseState();

  const heading = `${getDomain(url)} side panel`;

  return {
    type: "actionPanel",
    label: heading,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        isAvailable: makeIsAvailable(url),
      },
    },
    extension: {
      heading,
      body: [],
    },
  };
}

function selectExtensionPoint(
  formState: ActionPanelFormState
): ExtensionPointConfig<PanelDefinition> {
  const { extensionPoint, readers } = formState;
  const {
    definition: { isAvailable },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "actionPanel",
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
    },
  });
}

function selectExtension(
  { uuid, label, extensionPoint, extension, services }: ActionPanelFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<ActionPanelConfig> {
  return removeEmptyValues({
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    _recipe: null,
    label,
    services,
    config: options.includeInstanceIds
      ? extension
      : excludeInstanceIds(extension, "body"),
  });
}

function asDynamicElement(element: ActionPanelFormState): DynamicDefinition {
  return {
    type: "actionPanel",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPoint: selectExtensionPoint(element),
    readers: makeExtensionReaders(element),
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
    installed: true,
    type: extensionPoint.definition.type,
    label: heading,

    readers: await makeReaderFormState(extensionPoint),
    services: [],

    extension: {
      heading,
      body: [],
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
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

  return {
    uuid: config.id,
    installed: true,
    type: extensionPoint.definition.type,
    label: config.label,

    readers: await makeReaderFormState(extensionPoint),
    services: config.services,

    extension: {
      ...config.config,
      heading: config.config.heading,
      body: withInstanceIds(castArray(config.config.body)),
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
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
        pages you choose
      </p>

      <p>
        Use an existing foundation, or start from scratch to have full control
        over when the panel appears
      </p>
    </div>
  ),
};

export default config;
