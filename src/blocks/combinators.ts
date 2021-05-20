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

import blockRegistry from "@/blocks/registry";
import { engineRenderer, mapArgs } from "@/helpers";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import CompositeReader from "@/blocks/readers/CompositeReader";
import { locate } from "@/background/locator";
import {
  SanitizedServiceConfiguration,
  IBlock,
  IReader,
  Logger,
  Schema,
  ServiceDependency,
  TemplateEngine,
  RenderedArgs,
  BlockArg,
  ReaderRoot,
  MessageContext,
} from "@/core";
import { validateInput } from "@/validators/generic";
import { OutputUnit } from "@cfworker/json-schema";
import { pickBy, isPlainObject, mapValues, castArray } from "lodash";
import { BusinessError, ContextError } from "@/errors";
import {
  executeInOpener,
  executeInTarget,
  executeInAll,
} from "@/background/executor";
import { boolean } from "@/utils";
import { getLoggingConfig } from "@/background/logging";
import { NotificationCallbacks, notifyProgress } from "@/contentScript/notify";
import { sendDeploymentAlert } from "@/background/telemetry";
import { reportError } from "@/telemetry/logging";
import { serializeError } from "serialize-error";

export type ReaderConfig =
  | string
  | { [key: string]: ReaderConfig }
  | ReaderConfig[];

export interface BlockConfig {
  id: string;

  // (Optional) human-readable label for the step. Shown in the progress indicator
  label?: string;

  // (Optional) indicate the step is being run in the interface
  notifyProgress?: boolean;

  onError?: {
    alert?: boolean;
  };

  window?: "self" | "opener" | "target" | "broadcast";

  outputKey?: string;

  // (Optional) condition expression written in templateEngine for deciding if the step should be run. If not
  // provided, the step is run unconditionally.
  if?: string | boolean | number;

  // (Optional) root selector for reader
  root?: string;

  // (Optional) template language to use for rendering the if and config properties. Default is mustache
  templateEngine?: TemplateEngine;

  config: Record<string, unknown>;
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
 * Error bailing if a renderer component is encountered while running in headless mode
 */
export class HeadlessModeError extends Error {
  public readonly blockId: string;
  public readonly args: unknown;
  public readonly ctxt: unknown;
  public readonly loggerContext: MessageContext;

  constructor(
    blockId: string,
    args: unknown,
    ctxt: unknown,
    loggerContext: MessageContext
  ) {
    super(`${blockId} is a renderer`);
    this.name = "HeadlessModeError";
    this.blockId = blockId;
    this.args = args;
    this.ctxt = ctxt;
    this.loggerContext = loggerContext;
  }
}

/**
 * Error indicating input elements to a block did not match the schema.
 */
export class InputValidationError extends BusinessError {
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
  logValues?: boolean;
  headless?: boolean;
  serviceArgs?: RenderedArgs;
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

function isReader(block: IBlock): block is IReader {
  return "read" in block;
}

function isRendererBlock(block: IBlock & { render?: Function }): boolean {
  return typeof block.render === "function";
}

// eslint-disable-next-line @typescript-eslint/ban-types
function isEffectBlock(block: IBlock & { effect?: Function }): boolean {
  return typeof block.effect === "function";
}

type StageOptions = {
  context: RenderedArgs;
  validate: boolean;
  logValues: boolean;
  logger: Logger;
  headless?: boolean;
  root: ReaderRoot;
};

async function runStage(
  block: IBlock,
  stage: BlockConfig,
  args: RenderedArgs,
  { root, context, validate, logValues, logger, headless }: StageOptions
): Promise<unknown> {
  const argContext = { ...context, ...args };
  const stageConfig = stage.config ?? {};

  let blockArgs: BlockArg;

  if (isReader(block)) {
    if ((stage.window ?? "self") === "self") {
      // TODO: allow the stage to define a different root within the extension root
      blockArgs = { root };
      logger.debug(
        `Passed root to reader ${stage.id} (window=${stage.window ?? "self"})`
      );
    } else {
      // TODO: allow other roots in other tabs
      blockArgs = {};
      // By not setting the root, the other tab's document is user
      logger.debug(
        `Passed blank root to reader ${stage.id} (window=${
          stage.window ?? "self"
        })`
      );
    }
  } else {
    // HACK: hack to avoid applying a list to the config for blocks that pass a list to the next block
    blockArgs = isPlainObject(args)
      ? mapArgs(stageConfig, argContext, engineRenderer(stage.templateEngine))
      : stageConfig;

    if (logValues) {
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
    }
  }

  if (validate) {
    const validationResult = await validateInput(
      castSchema(block.inputSchema),
      excludeUndefined(blockArgs)
    );
    if (!validationResult.valid) {
      // don't need to check logValues here because this is logging to the console, not the provided logger
      // so the values won't be persisted
      console.debug("Invalid inputs for block", {
        errors: validationResult.errors,
        schema: block.inputSchema,
        blockArgs,
      });

      throw new InputValidationError(
        "Invalid inputs for block",
        block.inputSchema,
        blockArgs,
        validationResult.errors
      );
    }
  }

  let progressCallbacks: NotificationCallbacks;

  if (stage.notifyProgress) {
    progressCallbacks = notifyProgress(
      logger.context.extensionId,
      stage.label ?? block.name
    );
  }

  if (isRendererBlock(block) && headless) {
    throw new HeadlessModeError(block.id, blockArgs, args, logger.context);
  }

  try {
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
    } else if (stage.window === "broadcast") {
      return await executeInAll(stage.id, blockArgs, {
        ctxt: args,
        messageContext: logger.context,
      });
    } else if (stage.window ?? "self" === "self") {
      return await block.run(blockArgs, { ctxt: args, logger, root, headless });
    } else {
      throw new BusinessError(`Unexpected stage window ${stage.window}`);
    }
  } finally {
    progressCallbacks?.hide();
  }
}

/** Execute a pipeline of blocks and return the result. */
export async function reducePipeline(
  config: BlockConfig | BlockPipeline,
  renderedArgs: RenderedArgs,
  logger: Logger,
  root: HTMLElement | Document = null,
  options: ReduceOptions = {
    validate: true,
    logValues: false,
    headless: false,
    serviceArgs: {} as RenderedArgs,
  }
): Promise<unknown> {
  const extraContext: RenderedArgs = {
    "@input": renderedArgs,
    ...options.serviceArgs,
  };

  // If logValues not provided explicitly by the extension point, use the global value
  let logValues = options.logValues;
  if (logValues === undefined) {
    logValues = (await getLoggingConfig()).logValues ?? false;
  }

  let currentArgs: RenderedArgs = renderedArgs;

  for (const [index, stage] of castArray(config).entries()) {
    const stageContext = { blockId: stage.id };
    const stageLogger = logger.childLogger(stageContext);

    try {
      const $stageRoot = stage.root
        ? $(root ?? document).find(stage.root)
        : $(root ?? document);

      if ($stageRoot.length > 1) {
        throw new BusinessError(`Multiple roots found for ${stage.root}`);
      } else if ($stageRoot.length === 0) {
        throw new BusinessError(
          `No roots found for ${stage.root} (root=${
            (root as HTMLElement).tagName ?? "document"
          })`
        );
      }

      const stageRoot = $stageRoot.get(0);

      if ("if" in stage) {
        const { if: condition } = mapArgs(
          { if: stage.if },
          { ...extraContext, ...currentArgs },
          engineRenderer(stage.templateEngine)
        );
        if (!boolean(condition)) {
          logger.debug(
            `Skipping stage #${index + 1} ${stage.id} because condition not met`
          );
          continue;
        }
      }

      const block = await blockRegistry.lookup(stage.id);

      const output = await runStage(block, stage, currentArgs, {
        root: stageRoot,
        context: extraContext,
        logValues,
        validate: options.validate,
        headless: options.headless,
        logger: stageLogger,
      });

      if (logValues) {
        logger.debug(`Output for block #${index + 1}: ${stage.id}`, {
          output,
          outputKey: stage.outputKey ? `@${stage.outputKey}` : null,
        });
      }

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
      if (ex instanceof HeadlessModeError) {
        // An "expected" error, let the caller deal with it
        throw ex;
      }

      if (stage.onError?.alert) {
        if (logger.context.deploymentId) {
          try {
            sendDeploymentAlert({
              deploymentId: logger.context.deploymentId,
              data: {
                id: stage.id,
                args: currentArgs,
                error: serializeError(ex),
              },
            }).catch((err) => {
              reportError(err);
            });
          } catch (err) {
            reportError(err);
          }
        } else {
          console.warn("Can only send alert from deployment context");
        }
      }
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
    throw new BusinessError("Unexpected value for readerConfig");
  }
}

export type ServiceContext = {
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
