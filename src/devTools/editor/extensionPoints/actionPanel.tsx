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
import { FrameworkMeta } from "@/messaging/constants";
import {
  baseSelectExtensionPoint,
  excludeInstanceIds,
  lookupExtensionPoint,
  makeBaseState,
  makeExtensionReaders,
  makeIsAvailable,
  makeReaderFormState,
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
import FoundationTab from "@/devTools/editor/tabs/actionPanel/FoundationTab";
import ReaderTab from "@/devTools/editor/tabs/reader/ReaderTab";
import PanelTab from "@/devTools/editor/tabs/actionPanel/PanelTab";
import ServicesTab from "@/devTools/editor/tabs/ServicesTab";
import AvailabilityTab from "@/devTools/editor/tabs/AvailabilityTab";
import LogsTab from "@/devTools/editor/tabs/LogsTab";
import { DynamicDefinition } from "@/nativeEditor/dynamic";
import EffectTab from "@/devTools/editor/tabs/EffectTab";
import MetaTab from "@/devTools/editor/tabs/MetaTab";
import { uuidv4 } from "@/types/helpers";
import { getDomain } from "@/permissions/patterns";
import { faColumns } from "@fortawesome/free-solid-svg-icons";
import PanelConfiguration from "@/devTools/editor/tabs/actionPanel/PanelConfiguration";
import {
  BaseFormState,
  ElementConfig,
} from "@/devTools/editor/extensionPoints/elementConfig";
import React from "react";
import { BlockPipeline } from "@/blocks/types";
import EditTab from "@/devTools/editor/tabs/editTab/EditTab";

const wizard: WizardStep[] = [
  { step: "Name", Component: MetaTab },
  { step: "Foundation", Component: FoundationTab },
  { step: "Data", Component: ReaderTab },
  { step: "Panel", Component: PanelTab },
  { step: "Integrations", Component: ServicesTab },
  {
    step: "Content",
    Component: EffectTab,
    extraProps: { fieldName: "extension.body" },
  },
  { step: "Availability", Component: AvailabilityTab },
  { step: "Logs", Component: LogsTab },
];

const betaWizard: WizardStep[] = [
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
  metadata: Metadata,
  element: null,
  frameworks: FrameworkMeta[]
): ActionPanelFormState {
  const base = makeBaseState(uuidv4(), null, metadata, frameworks);

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
  return {
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "actionPanel",
      reader: readers.map((x) => x.metadata.id),
      isAvailable: pickBy(isAvailable, identity),
    },
  };
}

function selectExtension(
  { uuid, label, extensionPoint, extension, services }: ActionPanelFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<ActionPanelConfig> {
  return {
    id: uuid,
    extensionPointId: extensionPoint.metadata.id,
    _recipe: null,
    label,
    services,
    config: options.includeInstanceIds
      ? extension
      : excludeInstanceIds(extension, "body"),
  };
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
  betaWizard,
  EditorNode: PanelConfiguration,
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
