/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import castArray from "lodash/castArray";
import blockRegistry from "@/blocks/registry";
import isPlainObject from "lodash/isPlainObject";
import { engineRenderer, mapArgs } from "@/helpers";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import CompositeReader from "@/blocks/readers/CompositeReader";
import { locate } from "@/background/locator";
import mapValues from "lodash/mapValues";
import {
  SanitizedServiceConfiguration,
  IBlock,
  IReader,
  Logger,
  Schema,
  ServiceDependency,
  TemplateEngine,
  RenderedArgs,
} from "@/core";
import { validateInput } from "@/validators/generic";
import { OutputUnit } from "@cfworker/json-schema";
import pickBy from "lodash/pickBy";
import { ContextError } from "@/errors";
import { executeInOpener, executeInTarget } from "@/background/executor";

export type ReaderConfig =
  | string
  | { [key: string]: ReaderConfig }
  | ReaderConfig[];

export interface BlockConfig {
  id: string;
  window?: "self" | "opener" | "target";
  outputKey?: string;
  config: Record<string, unknown>;
  templateEngine?: TemplateEngine;
}

export type BlockPipeline = BlockConfig[];

class PipelineConfigurationError extends Error {
  readonly config: BlockPipeline;

  constructor(message: string, config: BlockConfig | BlockPipeline) {
    super(message);
    this.name = "PipelineConfigurationError";
    this.config = castArray(config);
  }
}

/**
 * Error indicating input elements to a block did not match the schema.
 */
export class InputValidationError extends Error {
  readonly schema: Schema;
  readonly input: unknown;
  readonly errors: OutputUnit[];

  constructor(
    message: string,
    schema: Schema,
    input: unknown,
    errors: OutputUnit[]
  ) {
    super(message);
    this.name = "InputValidationError";
    this.schema = schema;
    this.input = input;
    this.errors = errors;
  }
}

/** Return block definitions for all blocks referenced in a pipeline */
export async function blockList(
  config: BlockConfig | BlockPipeline
): Promise<IBlock[]> {
  return Promise.all(
    castArray(config).map(async ({ id }) => {
      if (id == null) {
        throw new PipelineConfigurationError(
          "Pipeline stage is missing a block id",
          config
        );
      }
      return await blockRegistry.lookup(id);
    })
  );
}

interface ReduceOptions {
  validate?: boolean;
  serviceArgs: RenderedArgs;
}

type SchemaProperties = { [key: string]: Schema };

function castSchema(schemaOrProperties: Schema | SchemaProperties): Schema {
  if (schemaOrProperties["type"] && schemaOrProperties["properties"]) {
    return schemaOrProperties as Schema;
  } else {
    return {
      type: "object",
      properties: schemaOrProperties as SchemaProperties,
    };
  }
}

function excludeUndefined(obj: unknown): unknown {
  if (isPlainObject(obj) && typeof obj === "object") {
    return mapValues(
      pickBy(obj, (x) => x !== undefined),
      excludeUndefined
    );
  } else {
    return obj;
  }
}

async function runStage(
  block: IBlock,
  stage: BlockConfig,
  args: RenderedArgs,
  {
    context,
    validate,
    logger,
  }: { context: RenderedArgs; validate: boolean; logger: Logger }
): Promise<unknown> {
  const argContext = { ...context, ...args };
  const stageConfig = stage.config ?? {};

  // HACK: hack to avoid applying a list to the config for blocks that pass a list to the next block
  const blockArgs = isPlainObject(args)
    ? mapArgs(stageConfig, argContext, engineRenderer(stage.templateEngine))
    : stageConfig;

  logger.debug(
    `Input for block ${stage.id} (window=${stage.window ?? "self"})`,
    {
      id: stage.id,
      template: stageConfig,
      templateContext: argContext,
      renderedArgs: blockArgs,
      blockContext: args,
    }
  );

  if (validate) {
    const validationResult = await validateInput(
      castSchema(block.inputSchema),
      excludeUndefined(blockArgs)
    );
    if (!validationResult.valid) {
      throw new InputValidationError(
        "Invalid inputs for block",
        block.inputSchema,
        blockArgs,
        validationResult.errors
      );
    }
  }

  if (stage.window === "opener") {
    return await executeInOpener(stage.id, blockArgs, {
      ctxt: args,
      messageContext: logger.context,
    });
  } else if (stage.window === "target") {
    return await executeInTarget(stage.id, blockArgs, {
      ctxt: args,
      messageContext: logger.context,
    });
  } else {
    return await block.run(blockArgs, { ctxt: args, logger });
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
function isEffectBlock(block: IBlock & { effect?: Function }): boolean {
  return typeof block.effect === "function";
}

/** Execute a pipeline of blocks and return the result. */
export async function reducePipeline(
  config: BlockConfig | BlockPipeline,
  renderedArgs: RenderedArgs,
  logger: Logger,
  options: ReduceOptions = { validate: true, serviceArgs: {} as RenderedArgs }
): Promise<unknown> {
  const extraContext: RenderedArgs = {
    "@input": renderedArgs,
    ...options.serviceArgs,
  };

  let currentArgs: RenderedArgs = renderedArgs;

  for (const [index, stage] of castArray(config).entries()) {
    const stageContext = { blockId: stage.id };
    const stageLogger = logger.childLogger(stageContext);

    try {
      const block = await blockRegistry.lookup(stage.id);

      const output = await runStage(block, stage, currentArgs, {
        context: extraContext,
        validate: options.validate,
        logger: stageLogger,
      });

      logger.debug(`Output for block #${index + 1}: ${stage.id}`, {
        output,
        outputKey: stage.outputKey ? `@${stage.outputKey}` : null,
      });

      if (isEffectBlock(block)) {
        if (stage.outputKey) {
          logger.warn(`Ignoring output key for effect ${block.id}`);
        }
        if (output != null) {
          console.warn(`Effect ${block.id} produced an output`, { output });
          logger.warn(`Ignoring output produced by effect ${block.id}`);
        }
      } else {
        if (stage.outputKey) {
          extraContext[`@${stage.outputKey}`] = output;
        } else {
          currentArgs = output as any;
        }
      }
    } catch (ex) {
      throw new ContextError(
        ex,
        stageContext,
        `An error occurred running pipeline stage #${index + 1}: ${stage.id}`
      );
    }
  }

  return currentArgs;
}

async function resolveObj<T>(
  obj: Record<string, Promise<T>>
): Promise<Record<string, T>> {
  const result: Record<string, T> = {};
  for (const [key, promise] of Object.entries(obj)) {
    result[key] = await promise;
  }
  return result;
}

/** Instantiate a reader from a reader configuration. */
export async function mergeReaders(
  readerConfig: ReaderConfig
): Promise<IReader> {
  if (typeof readerConfig === "string") {
    return (await blockRegistry.lookup(readerConfig)) as IReader;
  } else if (Array.isArray(readerConfig)) {
    return new ArrayCompositeReader(
      await Promise.all(readerConfig.map(mergeReaders))
    );
  } else if (isPlainObject(readerConfig)) {
    return new CompositeReader(
      await resolveObj(mapValues(readerConfig, mergeReaders))
    );
  } else {
    throw new Error("Unexpected value for readerConfig");
  }
}

type ServiceContext = {
  [outputKey: string]: {
    __service: SanitizedServiceConfiguration;
    [prop: string]: string | SanitizedServiceConfiguration | null;
  };
};

/** Build the service context by locating the dependencies */
export async function makeServiceContext(
  dependencies: ServiceDependency[]
): Promise<ServiceContext> {
  const ctxt: ServiceContext = {};
  for (const dependency of dependencies) {
    const configuredService = await locate(dependency.id, dependency.config);
    ctxt[`@${dependency.outputKey}`] = {
      // our JSON validator gets mad at undefined values
      ...pickBy(configuredService.config, (x) => x !== undefined),
      __service: configuredService,
    };
  }
  return ctxt;
}
