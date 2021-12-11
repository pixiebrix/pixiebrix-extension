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

import { define, FactoryConfig } from "cooky-cutter";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { getType } from "@/blocks/util";
import {
  ApiVersion,
  IBlock,
  IExtension,
  InnerDefinitionRef,
  RegistryId,
  RenderedArgs,
  Schema,
  ServiceDependency,
  UserOptions,
  Metadata,
  RecipeMetadata,
} from "@/core";
import { BlocksMap } from "@/devTools/editor/tabs/editTab/editTabTypes";
import { TraceError } from "@/telemetry/trace";
import { uuidv4, validateRegistryId, validateTimestamp } from "@/types/helpers";
import { Permissions, Runtime } from "webextension-polyfill";
import {
  BaseExtensionState,
  ElementType,
} from "@/devTools/editor/extensionPoints/elementConfig";
import trigger, {
  TriggerFormState,
} from "@/devTools/editor/extensionPoints/trigger";
import menuItem, {
  ActionFormState,
} from "@/devTools/editor/extensionPoints/menuItem";
import { ButtonSelectionResult } from "@/nativeEditor/insertButton";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { RecipeDefinition } from "@/types/definitions";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import {
  Context as DevtoolsContextType,
  FrameConnectionState,
} from "@/devTools/context";

export const metadataFactory = define<Metadata>({
  id: (n: number) => validateRegistryId(`test/recipe-${n}`),
  name: (n: number) => `Recipe ${n}`,
  description: "Recipe generated from factory",
  version: "1.0.0",
});

export const installedRecipeMetadataFactory = define<RecipeMetadata>({
  id: (n: number) => validateRegistryId(`test/recipe-${n}`),
  name: (n: number) => `Recipe ${n}`,
  description: "Recipe generated from factory",
  version: "1.0.0",
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  sharing: { public: false, organizations: [] },
});

const activePortFactory = define<Runtime.Port>({
  name: "Test Port",
  postMessage: jest.fn(),
  disconnect: jest.fn(),
  onDisconnect: jest.fn(),
  onMessage: jest.fn(),
});

const tabStateFactory = define<FrameConnectionState>({
  frameId: 0,
  hasPermissions: true,
  navSequence: uuidv4(),
  meta: null,
});

export const activeDevToolContextFactory = define<DevtoolsContextType>({
  connect: jest.fn(),
  connecting: false,
  port: activePortFactory,
  tabState: tabStateFactory,
});

export const extensionFactory: (
  extensionProperties?: Partial<IExtension>
) => IExtension = (extensionProperties) => ({
  id: uuidv4(),
  apiVersion: "v2" as ApiVersion,
  extensionPointId: validateRegistryId("test/extension-point"),
  _deployment: null,
  _recipe: null,
  label: "Test label",
  templateEngine: null,
  permissions: null,
  definitions: null,
  services: [],
  optionsArgs: null,
  config: {
    apiVersion: "v2" as ApiVersion,
    kind: "component",
    metadata: metadataFactory({
      id: validateRegistryId("test/component-1"),
      name: "Text config",
    }),
    inputSchema: {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {},
      required: [] as string[],
    },
    pipeline: [
      {
        id: "@pixiebrix/browser/open-tab",
        config: {
          url: "http://www.amazon.com/s",
          params: {
            url:
              "search-alias={{{department}}}{{^department}}all{{/department}}&field-keywords={{{query}}}",
          },
        },
      },
    ],
  },
  active: true,
  ...extensionProperties,
});

export const TEST_BLOCK_ID = validateRegistryId("testing/block-id");

export const traceErrorFactory: (
  traceErrorProperties?: Partial<TraceError>
) => TraceError = (traceErrorProperties) => ({
  timestamp: "2021-10-07T12:52:16.189Z",
  extensionId: uuidv4(),
  runId: uuidv4(),
  blockInstanceId: uuidv4(),
  blockId: TEST_BLOCK_ID,
  error: {
    message: "Trace error for tests",
  },
  templateContext: {},
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- nominal typing
  renderedArgs: {} as RenderedArgs,
  blockConfig: {
    id: TEST_BLOCK_ID,
    config: {},
  },
  ...traceErrorProperties,
});

export const blockFactory = define<IBlock>({
  id: (index: number) => validateRegistryId(`${TEST_BLOCK_ID}_${index}`),
  name: (index: number) => `${TEST_BLOCK_ID} ${index}`,
  inputSchema: null as Schema,
  defaultOptions: null,
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  permissions: {} as Permissions.Permissions,
  run: jest.fn(),
});

export const blocksMapFactory: (
  blockProperties?: Partial<IBlock>
) => Promise<BlocksMap> = async (blockProperties) => {
  const block1 = blockFactory(blockProperties);
  const block2 = blockFactory(blockProperties);

  return {
    [block1.id]: {
      block: block1,
      type: await getType(block1),
    },
    [block2.id]: {
      block: block2,
      type: await getType(block2),
    },
  };
};

export const blockConfigFactory = define<BlockConfig>({
  instanceId: () => uuidv4(),
  id: (index: number) => validateRegistryId(`${TEST_BLOCK_ID}_${index}`),
  config: () => ({}),
});

export const pipelineFactory: (
  blockConfigOverride?: FactoryConfig<BlockConfig>
) => BlockPipeline = (blockConfigProperties) => {
  const blockConfig1 = blockConfigFactory(blockConfigProperties);
  const blockConfig2 = blockConfigFactory(blockConfigProperties);

  return [blockConfig1, blockConfig2] as BlockPipeline;
};

export const baseExtensionStateFactory = define<BaseExtensionState>({
  blockPipeline: () => pipelineFactory(),
});

export const extensionPointFactory = define<ExtensionPointConfig>({
  kind: "extensionPoint",
  apiVersion: "v2",
  metadata: (n: number) =>
    metadataFactory({
      id: validateRegistryId(`test/extension-point-${n}`),
      name: `Extension Point ${n}`,
    }),
  definition: {
    type: "menuItem",
    isAvailable: {
      matchPatterns: ["https://*/*"],
    },
    reader: validateRegistryId("@pixiebrix/document-context"),
  },
});

type ExternalExtensionPointParameters = {
  extensionPointId?: RegistryId;
};

/**
 * Factory to create a RecipeDefinition that refers to a versioned extensionPoint
 * @param extensionPointId
 */
export const versionedExtensionPointRecipeFactory = ({
  extensionPointId,
}: ExternalExtensionPointParameters = {}) =>
  define<RecipeDefinition>({
    kind: "recipe",
    apiVersion: "v2",
    metadata: (n: number) => ({
      id: validateRegistryId(`test/recipe-${n}`),
      name: `Recipe ${n}`,
      description: "Recipe generated from factory",
      version: "1.0.0",
    }),
    sharing: { public: false, organizations: [] },
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
    definitions: undefined,
    options: undefined,
    extensionPoints: (n: number) => [
      {
        id: extensionPointId ?? validateRegistryId("test/extension-point"),
        label: `Test Extension for Recipe ${n}`,
        config: {
          caption: "Button",
          action: [] as BlockPipeline,
        },
      },
    ],
  });

type InnerExtensionPointParameters = {
  extensionPointRef?: InnerDefinitionRef;
};

/**
 * Factory to create a factory that creates a RecipeDefinition that refers to a versioned extensionPoint
 * @param extensionPointId
 */
export const innerExtensionPointRecipeFactory = ({
  extensionPointRef: extensionPointReference = "extensionPoint" as InnerDefinitionRef,
}: InnerExtensionPointParameters = {}) =>
  define<RecipeDefinition>({
    kind: "recipe",
    apiVersion: "v2",
    metadata: metadataFactory,
    sharing: { public: false, organizations: [] },
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
    definitions: {
      [extensionPointReference]: {
        kind: "extensionPoint",
        definition: {
          type: "menuItem",
          isAvailable: {
            matchPatterns: ["https://*/*"],
            urlPatterns: [],
            selectors: [],
          },
          reader: validateRegistryId("@pixiebrix/document-context"),
        },
      },
    },
    options: undefined,
    extensionPoints: (n: number) => [
      {
        id: extensionPointReference,
        label: `Test Extension for Recipe ${n}`,
        config: {
          caption: "Button",
          action: [] as BlockPipeline,
        },
      },
    ],
  });

/**
 * A default Recipe factory
 */
export const recipeFactory = innerExtensionPointRecipeFactory();

const internalFormStateFactory = define<FormState>({
  apiVersion: "v2" as ApiVersion,
  uuid: () => uuidv4(),
  installed: true,
  optionsArgs: null as UserOptions,
  services: [] as ServiceDependency[],
  recipe: null,

  type: "panel" as ElementType,
  label: (index: number) => `Element ${index}`,
  extension: baseExtensionStateFactory,
  extensionPoint: extensionPointFactory,
} as any);

export const formStateFactory = (
  override?: FactoryConfig<FormState>,
  blockConfigOverride?: FactoryConfig<BlockConfig>
) => {
  if (blockConfigOverride) {
    return internalFormStateFactory({
      ...override,
      extension: baseExtensionStateFactory({
        blockPipeline: pipelineFactory(blockConfigOverride),
      }),
    } as any);
  }

  return internalFormStateFactory(override);
};

export const triggerFormStateFactory = (
  override: FactoryConfig<TriggerFormState>,
  blockConfigOverride?: FactoryConfig<BlockConfig>
) => {
  const defaultTriggerProperties = trigger.fromNativeElement(
    "https://test.com",
    metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    null
  );

  return formStateFactory(
    {
      ...defaultTriggerProperties,
      ...override,
    } as any,
    blockConfigOverride
  ) as TriggerFormState;
};

export const menuItemFormStateFactory = (
  override: FactoryConfig<ActionFormState>,
  blockConfigOverride?: FactoryConfig<BlockConfig>
) => {
  const defaultTriggerProperties = menuItem.fromNativeElement(
    "https://test.com",
    metadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    {
      item: {
        caption: "Caption for test",
      },
    } as ButtonSelectionResult
  );

  return formStateFactory(
    {
      ...defaultTriggerProperties,
      ...override,
    } as any,
    blockConfigOverride
  ) as ActionFormState;
};
