/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import {
  baseFromModComponent,
  baseSelectModComponent,
  baseSelectStarterBrick,
  modComponentWithNormalizedPipeline,
  getImplicitReader,
  lookupStarterBrick,
  makeInitialBaseState,
  getDefaultAvailabilityForUrl,
  readerTypeHack,
  removeEmptyValues,
  selectStarterBrickAvailability,
  cleanIsAvailable,
} from "@/pageEditor/starterBricks/base";
import { omitEditorMetadata } from "./pipelineMapping";
import {
  getDefaultReportModeForTrigger,
  type TriggerConfig,
  type TriggerDefinition,
  TriggerStarterBrickABC,
} from "@/starterBricks/trigger/triggerStarterBrick";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { getDomain } from "@/permissions/patterns";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { type ModComponentFormStateAdapter } from "@/pageEditor/starterBricks/modComponentFormStateAdapter";
import TriggerConfiguration from "@/pageEditor/tabs/trigger/TriggerConfiguration";
import type { DraftModComponent } from "@/contentScript/pageEditor/types";
import { type TriggerFormState } from "./formStateTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

function fromNativeElement(
  url: string,
  metadata: Metadata,
  _element: null,
): TriggerFormState {
  return {
    type: "trigger",
    label: `My ${getDomain(url)} trigger`,
    ...makeInitialBaseState(),
    extensionPoint: {
      metadata,
      definition: {
        type: "trigger",
        trigger: "load",
        rootSelector: undefined,
        attachMode: undefined,
        targetMode: undefined,
        // Use "once" for reportMode, because the default is "load"
        reportMode: "once",
        // Show error notifications by default, to assist with development
        showErrors: true,
        intervalMillis: undefined,
        // Use `background: true` for the default for "load" trigger to 1) match the pre-1.8.7 behavior, and 2)
        // cause the trigger to run by default when the mod component is installed
        background: true,
        debounce: undefined,
        customEvent: undefined,
        reader: getImplicitReader("trigger"),
        isAvailable: getDefaultAvailabilityForUrl(url),
      },
    },
    extension: {
      blockPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: TriggerFormState,
): StarterBrickDefinitionLike<TriggerDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: {
      isAvailable,
      rootSelector,
      attachMode,
      targetMode,
      reportMode,
      showErrors,
      debounce,
      customEvent,
      intervalMillis,
      background,
      reader,
      trigger,
    },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectStarterBrick(formState),
    definition: {
      type: "trigger",
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
      trigger,
      debounce,
      customEvent,
      intervalMillis,
      background,
      attachMode,
      targetMode,
      reportMode: reportMode ?? getDefaultReportModeForTrigger(trigger),
      // Default to false for backward compatability. See https://github.com/pixiebrix/pixiebrix-extension/issues/2910
      showErrors: showErrors ?? false,
      rootSelector,
    },
  });
}

function selectExtension(
  state: TriggerFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<TriggerConfig> {
  const { extension } = state;
  const config: TriggerConfig = {
    action: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectModComponent(state),
    config,
  });
}

function asDraftModComponent(
  triggerFormState: TriggerFormState,
): DraftModComponent {
  return {
    type: "trigger",
    extension: selectExtension(triggerFormState, { includeInstanceIds: true }),
    extensionPointConfig: selectStarterBrickDefinition(triggerFormState),
  };
}

async function fromExtension(
  config: ModComponentBase<TriggerConfig>,
): Promise<TriggerFormState> {
  const starterBrick = await lookupStarterBrick<
    TriggerDefinition,
    TriggerConfig,
    "trigger"
  >(config, "trigger");

  const {
    rootSelector,
    attachMode,
    targetMode,
    reportMode,
    showErrors,
    trigger,
    reader,
    background,
    intervalMillis,
    debounce,
    customEvent,
  } = starterBrick.definition;

  const base = baseFromModComponent(config, starterBrick.definition.type);
  const modComponent = await modComponentWithNormalizedPipeline(
    config.config,
    "action",
  );

  assertNotNullish(starterBrick.metadata, "Starter brick metadata is required");

  return {
    ...base,
    extension: modComponent,
    extensionPoint: {
      metadata: starterBrick.metadata,
      definition: {
        type: starterBrick.definition.type,
        rootSelector,
        trigger,
        attachMode,
        targetMode,
        reportMode,
        showErrors,
        customEvent,
        debounce,
        background,
        intervalMillis,
        reader: readerTypeHack(reader),
        isAvailable: selectStarterBrickAvailability(starterBrick),
      },
    },
  };
}

const config: ModComponentFormStateAdapter<undefined, TriggerFormState> = {
  displayOrder: 4,
  elementType: "trigger",
  label: "Trigger",
  baseClass: TriggerStarterBrickABC,
  EditorNode: TriggerConfiguration,
  selectNativeElement: undefined,
  icon: faBolt,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectExtension,
  fromExtension,
};

export default config;
