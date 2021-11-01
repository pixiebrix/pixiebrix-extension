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

import { array, define } from "cooky-cutter";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { getType } from "@/blocks/util";
import {
  ApiVersion,
  IBlock,
  IExtension,
  Schema,
  ServiceDependency,
  UserOptions,
} from "@/core";
import { BlocksMap } from "@/devTools/editor/tabs/editTab/editTabTypes";
import { TraceError } from "@/telemetry/trace";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { Permissions } from "webextension-polyfill";
import { BaseExtensionState } from "@/devTools/editor/extensionPoints/elementConfig";
import { TriggerFormState } from "@/devTools/editor/extensionPoints/trigger";
import {
  contextBlock,
  echoBlock,
  identityBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";

const config = {
  apiVersion: "v2" as ApiVersion,
  kind: "component",
  metadata: {
    id: "test/component-1",
    version: "1.0.0",
    name: "Text config",
    description: "Component's config made for testing",
  },
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
};

export const extensionFactory: (
  extensionProps?: Partial<IExtension>
) => IExtension = (extensionProps) => ({
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
  config,
  active: true,
  ...extensionProps,
});

export const TEST_BLOCK_ID = validateRegistryId("testing/block-id");

export const traceErrorFactory: (
  traceErrorProps?: Partial<TraceError>
) => TraceError = (traceErrorProps) => {
  const errorTraceEntry: TraceError = {
    timestamp: "2021-10-07T12:52:16.189Z",
    extensionId: uuidv4(),
    runId: uuidv4(),
    blockInstanceId: uuidv4(),
    blockId: TEST_BLOCK_ID,
    error: {
      message: "Trace error for tests",
    },
    ...traceErrorProps,
  } as TraceError;

  return errorTraceEntry;
};

export const blockFactory = define<IBlock>({
  id: (i: number) => validateRegistryId(`${TEST_BLOCK_ID}_${i}`),
  name: (i: number) => `${TEST_BLOCK_ID} ${i}`,
  inputSchema: null as Schema,
  defaultOptions: null,
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  permissions: {} as Permissions.Permissions,
  run: jest.fn(),
});

export const blocksMapFactory: (
  blockProps?: Partial<IBlock>
) => Promise<BlocksMap> = async (blockProps) => {
  const block1 = blockFactory(blockProps);
  const block2 = blockFactory(blockProps);

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
  id: (i: number) => validateRegistryId(`${TEST_BLOCK_ID}_${i}`),
  config: {},
});

export const pipelineFactory: (
  blockConfigProps?: Partial<BlockConfig>
) => BlockPipeline = (blockConfigProps) => {
  const blockConfig1 = blockConfigFactory(blockConfigProps);
  const blockConfig2 = blockConfigFactory(blockConfigProps);

  return [blockConfig1, blockConfig2] as BlockPipeline;
};

export const baseExtensionStateFactory = define<BaseExtensionState>({
  blockPipeline: pipelineFactory,
});

const baseFormStateLike = {
  apiVersion: "v2" as ApiVersion,
  uuid: () => uuidv4(),
  installed: true,
  optionsArgs: null as UserOptions,
  services: [] as ServiceDependency[],
};

export const triggerFormStateFactory = define<TriggerFormState>({
  ...baseFormStateLike,

  type: "trigger",
  label: (i: number) => `Element ${i}`,
  extension: baseExtensionStateFactory,
  extensionPoint: {
    metadata: null,
    definition: {
      rootSelector: "body",
      trigger: "click",
      reader: validateRegistryId("test/reader"),
      isAvailable: null,
    },
  },
});
