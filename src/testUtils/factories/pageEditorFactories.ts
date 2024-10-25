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
import {
  starterBrickDefinitionFactory,
  starterBrickDefinitionPropFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import { type BrickPipeline, PipelineFlavor } from "@/bricks/types";
import contextMenu from "@/pageEditor/starterBricks/contextMenu";
import { validateRegistryId } from "@/types/helpers";
import menuItem from "@/pageEditor/starterBricks/button";
import { type ButtonSelectionResult } from "@/contentScript/pageEditor/types";
import quickBar from "@/pageEditor/starterBricks/quickBar";
import trigger from "@/pageEditor/starterBricks/trigger";
import { type TraceRecord } from "@/telemetry/trace";
import { type Except, type JsonObject } from "type-fest";
import sidebar from "@/pageEditor/starterBricks/sidebar";
import { traceRecordFactory } from "@/testUtils/factories/traceFactories";
import {
  brickConfigFactory,
  pipelineFactory,
} from "@/testUtils/factories/brickFactories";
import { type BaseModComponentState } from "@/pageEditor/store/editor/baseFormStateTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { type Permissions } from "webextension-polyfill";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import {
  createNewUnsavedModMetadata,
  emptyModVariablesDefinitionFactory,
} from "@/utils/modUtils";
import { type AddBrickLocation } from "@/pageEditor/store/editor/pageEditorTypes";

const baseModComponentStateFactory = define<BaseModComponentState>({
  brickPipeline: () => pipelineFactory(),
});

// TODO: Work out the type conflicts between StarterBrickDefinitionLike and BaseStarterBrickState
//       and then we can remove this type completely.
export type InternalFormStateOverride = Except<
  ModComponentFormState,
  "starterBrick"
> & {
  starterBrick: StarterBrickDefinitionLike;
};

const internalFormStateFactory = define<InternalFormStateOverride>({
  apiVersion: "v3" as ApiVersion,
  uuid: uuidSequence,
  installed: true,
  optionsArgs() {
    return {} as OptionsArgs;
  },
  variablesDefinition: () => emptyModVariablesDefinitionFactory(),
  integrationDependencies(): IntegrationDependency[] {
    return [];
  },
  modMetadata: (n: number) =>
    createNewUnsavedModMetadata({ modName: `Unsaved Mod ${n}` }),
  permissions(): Permissions.Permissions {
    return {
      permissions: [],
      origins: [],
    };
  },
  label: (i: number) => `Element ${i}`,
  modComponent: baseModComponentStateFactory,
  starterBrick: starterBrickDefinitionFactory,
});

type FormStateFactoryOptions = {
  formStateConfig?: FactoryConfig<InternalFormStateOverride>;
  brickPipeline?: BrickPipeline;
  starterBrick?: StarterBrickDefinitionLike;
};

export const formStateFactory = ({
  formStateConfig,
  brickPipeline,
  starterBrick,
}: FormStateFactoryOptions = {}): ModComponentFormState => {
  const factoryConfig: FactoryConfig<InternalFormStateOverride> =
    formStateConfig || {};

  if (brickPipeline) {
    factoryConfig.modComponent = baseModComponentStateFactory({
      brickPipeline,
    });
  }

  if (starterBrick) {
    factoryConfig.starterBrick = starterBrick;
  }

  return internalFormStateFactory(factoryConfig) as ModComponentFormState;
};

// Define a method to reset the sequence for formStateFactory given that it's not a factory definition
formStateFactory.resetSequence = () => {
  // Reset the sequence for the internal factories
  baseModComponentStateFactory.resetSequence();
  internalFormStateFactory.resetSequence();
  brickConfigFactory.resetSequence();
  starterBrickDefinitionFactory.resetSequence();
  starterBrickDefinitionPropFactory.resetSequence();
};

export const triggerFormStateFactory = (
  override?: FactoryConfig<TriggerFormState>,
  pipelineOverride?: BrickPipeline,
) => {
  const defaultProps = trigger.fromNativeElement({
    url: "https://test.com",
    modMetadata: createNewUnsavedModMetadata({ modName: "Unsaved Mod" }),
    starterBrickMetadata: metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    element: null,
  });

  return formStateFactory({
    formStateConfig: {
      ...defaultProps,
      ...override,
    } as FactoryConfig<InternalFormStateOverride>,
    brickPipeline: pipelineOverride,
  }) as TriggerFormState;
};

export const sidebarPanelFormStateFactory = (
  override?: FactoryConfig<SidebarFormState>,
  pipelineOverride?: BrickPipeline,
): SidebarFormState => {
  const defaultProps = sidebar.fromNativeElement({
    url: "https://test.com",
    modMetadata: createNewUnsavedModMetadata({ modName: "Unsaved Mod" }),
    starterBrickMetadata: metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    element: null,
  });

  return formStateFactory({
    formStateConfig: {
      ...defaultProps,
      ...override,
    } as FactoryConfig<InternalFormStateOverride>,
    brickPipeline: pipelineOverride,
  }) as SidebarFormState;
};

export const contextMenuFormStateFactory = (
  override?: FactoryConfig<ContextMenuFormState>,
  pipelineOverride?: BrickPipeline,
) => {
  const defaultProps = contextMenu.fromNativeElement({
    url: "https://test.com",
    modMetadata: createNewUnsavedModMetadata({ modName: "Unsaved Mod" }),
    starterBrickMetadata: metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    element: null,
  });

  return formStateFactory({
    formStateConfig: {
      ...defaultProps,
      ...override,
    } as FactoryConfig<InternalFormStateOverride>,
    brickPipeline: pipelineOverride,
  }) as ContextMenuFormState;
};

export const quickbarFormStateFactory = (
  override?: FactoryConfig<QuickBarFormState>,
  pipelineOverride?: BrickPipeline,
) => {
  const defaultProps = quickBar.fromNativeElement({
    url: "https://test.com",
    modMetadata: createNewUnsavedModMetadata({ modName: "Unsaved Mod" }),
    starterBrickMetadata: metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    element: null,
  });

  return formStateFactory({
    formStateConfig: {
      ...defaultProps,
      ...override,
    } as FactoryConfig<InternalFormStateOverride>,
    brickPipeline: pipelineOverride,
  }) as QuickBarFormState;
};

export const menuItemFormStateFactory = (
  override?: FactoryConfig<ButtonFormState>,
  pipelineOverride?: BrickPipeline,
) => {
  const defaultTriggerProps = menuItem.fromNativeElement({
    url: "https://test.com",
    modMetadata: createNewUnsavedModMetadata({ modName: "Unsaved Mod" }),
    starterBrickMetadata: metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    element: {
      item: {
        caption: "Caption for test",
      },
    } as ButtonSelectionResult,
  });

  return formStateFactory({
    formStateConfig: {
      ...defaultTriggerProps,
      ...override,
    } as FactoryConfig<InternalFormStateOverride>,
    brickPipeline: pipelineOverride,
  }) as ButtonFormState;
};

const starterBrickOutputFactory = define<JsonObject>({
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
    // Not a real cooky-cutter factory, so call as a function
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
    let output: JsonObject = starterBrickOutputFactory();
    return modComponent.brickPipeline.map((brickConfig, index) => {
      const context = output;
      outputKey = validateOutputKey(`output${index}`);
      output = {
        foo: `bar number ${index}`,
        baz: index * 3,
        qux: {
          thing1: [index * 7, index * 9, index * 11],
          thing2: false,
        },
      };

      return traceRecordFactory({
        modComponentId,
        brickInstanceId: brickConfig.instanceId,
        brickId: brickConfig.id,
        templateContext: context,
        brickConfig,
        outputKey,
        output,
      });
    });
  }, "formState"),
});

export const addBrickLocationFactory = define<AddBrickLocation>({
  path: "body",
  flavor: PipelineFlavor.AllBricks,
  index: 0,
});
