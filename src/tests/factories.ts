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

import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { IBlock, IExtension } from "@/core";
import { TraceError } from "@/telemetry/trace";
import { uuidv4, validateRegistryId } from "@/types/helpers";

const config = {
  apiVersion: "v1",
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
  apiVersion: "v1",
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

export const pipelineFactory: (
  blockConfigProps?: Partial<BlockConfig>
) => BlockPipeline = (blockConfigProps) => {
  const pipelineBlock: BlockConfig = {
    instanceId: uuidv4(),
    id: TEST_BLOCK_ID,
    ...blockConfigProps,
  } as BlockConfig;

  const anotherBlock: BlockConfig = {
    instanceId: uuidv4(),
    id: TEST_BLOCK_ID,
    ...blockConfigProps,
  } as BlockConfig;

  return [pipelineBlock, anotherBlock];
};

export const blockFactory: (blockProps?: Partial<IBlock>) => IBlock = (
  blockProps
) =>
  ({
    id: TEST_BLOCK_ID,
    ...blockProps,
  } as IBlock);
