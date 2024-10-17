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
import {
  type ModComponentBase,
  type ModMetadata,
} from "@/types/modComponentTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { ReportModes } from "@/starterBricks/trigger/triggerStarterBrickTypes";

function fromNativeElement({
  starterBrickMetadata,
  modMetadata,
  url,
}: {
  url: string;
  modMetadata: ModMetadata;
  starterBrickMetadata: Metadata;
}): TriggerFormState {
  return {
    label: `My ${getDomain(url)} trigger`,
    ...makeInitialBaseState({ modMetadata }),
    starterBrick: {
      metadata: starterBrickMetadata,
      definition: {
        type: StarterBrickTypes.TRIGGER,
        trigger: "load",
        rootSelector: undefined,
        attachMode: undefined,
        targetMode: undefined,
        // Use "once" for reportMode, because the default is "load"
        reportMode: ReportModes.ONCE,
        // Show error notifications by default, to assist with development
        showErrors: true,
        intervalMillis: undefined,
        // Use `background: true` for the default for "load" trigger to 1) match the pre-1.8.7 behavior, and 2)
        // cause the trigger to run by default when the mod component is activated
        background: true,
        debounce: undefined,
        customEvent: undefined,
        reader: getImplicitReader(StarterBrickTypes.TRIGGER),
        isAvailable: getDefaultAvailabilityForUrl(url),
      },
    },
    modComponent: {
      brickPipeline: [],
    },
  };
}

function selectStarterBrickDefinition(
  formState: TriggerFormState,
): StarterBrickDefinitionLike<TriggerDefinition> {
  const { starterBrick } = formState;
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
  } = starterBrick;
  return removeEmptyValues({
    ...baseSelectStarterBrick(formState),
    definition: {
      type: StarterBrickTypes.TRIGGER,
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

function selectModComponent(
  state: TriggerFormState,
  options: { includeInstanceIds?: boolean } = {},
): ModComponentBase<TriggerConfig> {
  const { modComponent } = state;
  const config: TriggerConfig = {
    action: options.includeInstanceIds
      ? modComponent.brickPipeline
      : omitEditorMetadata(modComponent.brickPipeline),
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
    type: StarterBrickTypes.TRIGGER,
    extension: selectModComponent(triggerFormState, {
      includeInstanceIds: true,
    }),
    extensionPointConfig: selectStarterBrickDefinition(triggerFormState),
  };
}

async function fromModComponent(
  config: ModComponentBase<TriggerConfig>,
): Promise<TriggerFormState> {
  const starterBrick = await lookupStarterBrick<
    TriggerDefinition,
    TriggerConfig,
    typeof StarterBrickTypes.TRIGGER
  >(config, StarterBrickTypes.TRIGGER);

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
    modComponent,
    starterBrick: {
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
  starterBrickType: StarterBrickTypes.TRIGGER,
  label: "Trigger",
  baseClass: TriggerStarterBrickABC,
  StarterBrickConfiguration: TriggerConfiguration,
  selectNativeElement: undefined,
  icon: faBolt,
  fromNativeElement,
  asDraftModComponent,
  selectStarterBrickDefinition,
  selectModComponent,
  fromModComponent,
};

export default config;
