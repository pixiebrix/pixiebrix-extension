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

import { define, derive, type FactoryConfig } from "cooky-cutter";
import {
  type ButtonFormState,
  type ContextMenuFormState,
  type ModComponentFormState,
  type QuickBarFormState,
  type SidebarFormState,
  type TriggerFormState,
} from "@/pageEditor/starterBricks/formStateTypes";
import {
  type ApiVersion,
  type OptionsArgs,
  type OutputKey,
} from "@/types/runtimeTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { starterBrickDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import { type BrickPipeline } from "@/bricks/types";
import contextMenu from "@/pageEditor/starterBricks/contextMenu";
import { validateRegistryId } from "@/types/helpers";
import menuItem from "@/pageEditor/starterBricks/button";
import { type ButtonSelectionResult } from "@/contentScript/pageEditor/types";
import quickBar from "@/pageEditor/starterBricks/quickBar";
import trigger from "@/pageEditor/starterBricks/trigger";
import { type TraceRecord } from "@/telemetry/trace";
import { type JsonObject } from "type-fest";
import sidebar from "@/pageEditor/starterBricks/sidebar";
import { traceRecordFactory } from "@/testUtils/factories/traceFactories";
import {
  brickConfigFactory,
  pipelineFactory,
} from "@/testUtils/factories/brickFactories";
import { type DerivedFunction } from "cooky-cutter/dist/derive";
import { type BaseModComponentState } from "@/pageEditor/store/editor/baseFormStateTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

export const baseModComponentStateFactory = define<BaseModComponentState>({
  brickPipeline: () => pipelineFactory(),
});

type InternalFormStateOverride = ModComponentFormState & {
  extensionPoint: DerivedFunction<
    ModComponentFormState,
    StarterBrickDefinitionLike
  >;
};

const internalFormStateFactory = define<InternalFormStateOverride>({
  apiVersion: "v3" as ApiVersion,
  uuid: uuidSequence,
  installed: true,
  optionsArgs: () => ({}) as OptionsArgs,
  integrationDependencies(): IntegrationDependency[] {
    return [];
  },
  modMetadata: undefined,
  type: StarterBrickTypes.SIDEBAR_PANEL,
  label: (i: number) => `Element ${i}`,
  modComponent: baseModComponentStateFactory,
  // @ts-expect-error -- TODO: verify typings
  starterBrick: derive<ModComponentFormState, StarterBrickDefinitionLike>(
    ({ type }) => {
      // FIXME: the starter brick type produced is not based on the type provided
      const starterBrick = starterBrickDefinitionFactory();
      if (type) {
        starterBrick.definition.type = type;
      }

      return starterBrick;
    },
    "type",
  ),
});

export const formStateFactory = (
  override?: FactoryConfig<ModComponentFormState>,
  pipelineOverride?: BrickPipeline,
): ModComponentFormState => {
  if (pipelineOverride) {
    return internalFormStateFactory({
      ...override,
      modComponent: baseModComponentStateFactory({
        brickPipeline: pipelineOverride,
      }),
    } as InternalFormStateOverride);
  }

  return internalFormStateFactory(override as InternalFormStateOverride);
};

// Define a method to reset the sequence for formStateFactory given that it's not a factory definition
formStateFactory.resetSequence = () => {
  // Reset the sequence for the internal factories
  baseModComponentStateFactory.resetSequence();
  internalFormStateFactory.resetSequence();
  brickConfigFactory.resetSequence();
  starterBrickDefinitionFactory.resetSequence();
};

export const triggerFormStateFactory = (
  override?: FactoryConfig<TriggerFormState>,
  pipelineOverride?: BrickPipeline,
) => {
  const defaultTriggerProps = trigger.fromNativeElement(
    "https://test.com",
    metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    null,
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as FactoryConfig<ModComponentFormState>,
    pipelineOverride,
  ) as TriggerFormState;
};

export const sidebarPanelFormStateFactory = (
  override?: FactoryConfig<SidebarFormState>,
  pipelineOverride?: BrickPipeline,
): SidebarFormState => {
  const defaultTriggerProps = sidebar.fromNativeElement(
    "https://test.com",
    metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    // TypeScript complains if the 3rd positional argument is left off
    undefined as never,
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as FactoryConfig<ModComponentFormState>,
    pipelineOverride,
  ) as SidebarFormState;
};

export const contextMenuFormStateFactory = (
  override?: FactoryConfig<ContextMenuFormState>,
  pipelineOverride?: BrickPipeline,
) => {
  const defaultTriggerProps = contextMenu.fromNativeElement(
    "https://test.com",
    metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    null,
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as FactoryConfig<ModComponentFormState>,
    pipelineOverride,
  ) as ContextMenuFormState;
};

export const quickbarFormStateFactory = (
  override?: FactoryConfig<QuickBarFormState>,
  pipelineOverride?: BrickPipeline,
) => {
  const defaultTriggerProps = quickBar.fromNativeElement(
    "https://test.com",
    metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    null,
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as FactoryConfig<ModComponentFormState>,
    pipelineOverride,
  ) as QuickBarFormState;
};

export const menuItemFormStateFactory = (
  override?: FactoryConfig<ButtonFormState>,
  pipelineOverride?: BrickPipeline,
) => {
  const defaultTriggerProps = menuItem.fromNativeElement(
    "https://test.com",
    metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    {
      item: {
        caption: "Caption for test",
      },
    } as ButtonSelectionResult,
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as FactoryConfig<ModComponentFormState>,
    pipelineOverride,
  ) as ButtonFormState;
};

const foundationOutputFactory = define<JsonObject>({
  "@input": () => ({
    icon: "",
    title: "Test website title | test.com",
    language: "en",
    url: "https://www.testwebsite.com/",
    provider: "test",
  }),
  "@options": () => ({
    option1: "test string option",
    option2: 42,
  }),
});

export const formStateWithTraceDataFactory = define<{
  formState: ModComponentFormState;
  records: TraceRecord[];
}>({
  formState(): ModComponentFormState {
    return formStateFactory();
  },
  records: derive<
    {
      formState: ModComponentFormState;
      records: TraceRecord[];
    },
    TraceRecord[]
  >(({ formState }) => {
    assertNotNullish(formState, "formState is required");
    const { uuid: modComponentId, modComponent } = formState;

    let outputKey = "" as OutputKey;
    let output: JsonObject = foundationOutputFactory();
    return modComponent.brickPipeline.map((block, index) => {
      const context = output;
      outputKey = `output${index}` as OutputKey;
      output = {
        foo: `bar number ${index}`,
        baz: index * 3,
        qux: {
          thing1: [index * 7, index * 9, index * 11],
          thing2: false,
        },
      };

      return traceRecordFactory({
        extensionId: modComponentId,
        blockInstanceId: block.instanceId,
        blockId: block.id,
        templateContext: context,
        blockConfig: block,
        outputKey,
        output,
      });
    });
  }, "formState"),
});
