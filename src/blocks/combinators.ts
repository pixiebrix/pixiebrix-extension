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

import blockRegistry from "@/blocks/registry";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import CompositeReader from "@/blocks/readers/CompositeReader";
import { locate } from "@/background/locator";
import {
  BlockArg,
  IBlock,
  IReader,
  Logger,
  MessageContext,
  OutputKey,
  ReaderRoot,
  RenderedArgs,
  SanitizedServiceConfiguration,
  Schema,
  ServiceDependency,
  UserOptions,
  UUID,
} from "@/core";
import { validateInput, validateOutput } from "@/validators/generic";
import { castArray, isEmpty, isPlainObject, mapValues, pickBy } from "lodash";
import { BusinessError, ContextError } from "@/errors";
import {
  executeInAll,
  executeInOpener,
  executeInTarget,
  executeOnServer,
} from "@/background/executor";
import { boolean, excludeUndefined, resolveObj } from "@/utils";
import { getLoggingConfig } from "@/background/logging";
import { NotificationCallbacks, notifyProgress } from "@/contentScript/notify";
import { sendDeploymentAlert } from "@/background/telemetry";
import { serializeError } from "serialize-error";
import {
  HeadlessModeError,
  InputValidationError,
  OutputValidationError,
  PipelineConfigurationError,
  RemoteExecutionError,
} from "@/blocks/errors";
import { engineRenderer } from "@/runtime/renderers";
import { BlockConfig, BlockPipeline, ReaderConfig } from "./types";
import { TraceRecordMeta } from "@/telemetry/trace";
import { JsonObject } from "type-fest";
import { recordTraceEntry, recordTraceExit } from "@/background/trace";
import { uuidv4 } from "@/types/helpers";
import { getType } from "@/blocks/util";
import { mapArgs } from "@/runtime/mapArgs";
import { ApiVersionOptions } from "@/runtime/apiVersionOptions";

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

      return blockRegistry.lookup(id);
    })
  );
}

type ReduceOptions = ApiVersionOptions & {
  /**
   * `true` to throw an error if JSON Schema validation fails against the inputSchema for a brick. Logs a warning
   * if the errors don't match the outputSchema (if an outputSchema is provided)
   */
  validate?: boolean;
  /**
   * `true` to log all inputs to the extension logger. The user toggles this setting on the Settings page
   */
  logValues?: boolean;
  /**
   * `true` to throw an error if a renderer is encountered. Used to abort execution in the contentScript to pass
   * data over to be rendered in a PixieBrix sidebar actionPanel.
   */
  headless?: boolean;
  /**
   * Option values provided by the user during activation of an extension
   */
  optionsArgs?: UserOptions;
  /**
   * Service credentials provided by the user during activation of an extension
   */
  serviceArgs?: RenderedArgs;
  /**
   * A UUID to correlate trace records for a brick
   */
  runId?: UUID;
};

type SchemaProperties = Record<string, Schema>;

function castSchema(schemaOrProperties: Schema | SchemaProperties): Schema {
  if (schemaOrProperties.type && schemaOrProperties.properties) {
    return schemaOrProperties as Schema;
  }

  return {
    type: "object",
    properties: schemaOrProperties as SchemaProperties,
  };
}

type TraceOptions = {
  runId: UUID;
  blockInstanceId: UUID;
};

const defaultTraceOptions: TraceOptions = {
  runId: undefined,
  blockInstanceId: undefined,
};

type StageOptions = Pick<
  ApiVersionOptions,
  "explicitArg" | "explicitRender"
> & {
  context: RenderedArgs;
  validate: boolean;
  logValues: boolean;
  logger: Logger;
  headless?: boolean;
  root: ReaderRoot;
  trace?: TraceOptions;
};

export async function runStage(
  block: IBlock,
  stage: BlockConfig,
  args: RenderedArgs,
  {
    root,
    context,
    validate,
    logValues,
    logger,
    headless,
    explicitArg,
    explicitRender,
    trace = defaultTraceOptions,
  }: StageOptions
): Promise<unknown> {
  const argContext = { ...context, ...args };
  const stageConfig = stage.config ?? {};

  // If logValues not provided explicitly, default to the global setting
  if (logValues === undefined) {
    logValues = (await getLoggingConfig()).logValues ?? false;
  }

  let blockArgs: BlockArg;

  const tracePayload: TraceRecordMeta = {
    ...trace,
    blockId: block.id,
    extensionId: logger.context.extensionId,
  };

  const blockType = await getType(block);

  if (blockType === "reader") {
    // `reducePipeline` is responsible for passing the correct root into runStage based based on the BlockConfig
    if ((stage.window ?? "self") === "self") {
      blockArgs = { root };
      logger.debug(
        `Passed root to reader ${stage.id} (window=${stage.window ?? "self"})`
      );
    } else {
      // TODO: allow non-document roots in other tabs
      blockArgs = {};
      // By not setting the root, the other tab's document is user
      logger.debug(
        `Passed blank root to reader ${stage.id} (window=${
          stage.window ?? "self"
        })`
      );
    }
  } else {
    if (!explicitArg && !isPlainObject(args)) {
      // HACK: hack from older versions to avoid applying a list to the config for blocks that pass a list to
      // the next block. (Because originally in PixieBrix there was so way to explicitly pass list variables
      // via outputKeys/variable expressions).
      blockArgs = stageConfig;
    }

    blockArgs = await mapArgs(stageConfig, argContext, {
      implicitRender: explicitRender
        ? null
        : await engineRenderer(stage.templateEngine),
    });

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

    void recordTraceEntry({
      ...tracePayload,
      timestamp: new Date().toISOString(),
      templateContext: argContext as JsonObject,
      renderedArgs: blockArgs,
      blockConfig: stage,
    });
  }

  if (validate) {
    const validationResult = await validateInput(
      castSchema(block.inputSchema),
      excludeUndefined(blockArgs)
    );
    if (!validationResult.valid) {
      // Don't need to check logValues here because this is logging to the console, not the provided logger
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

  if (blockType === "renderer" && headless) {
    throw new HeadlessModeError(block.id, blockArgs, args, logger.context);
  }

  try {
    const baseOptions = {
      ctxt: args,
      messageContext: logger.context,
    };

    switch (stage.window ?? "self") {
      case "opener": {
        return await executeInOpener(stage.id, blockArgs, baseOptions);
      }

      case "target": {
        return await executeInTarget(stage.id, blockArgs, baseOptions);
      }

      case "broadcast": {
        return await executeInAll(stage.id, blockArgs, baseOptions);
      }

      case "remote": {
        const { data, error } = (
          await executeOnServer(stage.id, blockArgs)
        ).data;
        if (error) {
          throw new RemoteExecutionError(
            "Error while executing brick remotely",
            error
          );
        }

        return data;
      }

      case "self": {
        return await block.run(blockArgs, {
          ...baseOptions,
          logger,
          root,
          headless,
        });
      }

      default: {
        throw new BusinessError(`Unexpected stage window ${stage.window}`);
      }
    }
  } finally {
    if (progressCallbacks) {
      progressCallbacks.hide();
    }
  }
}

function arraySchema(itemSchema: Schema): Schema {
  return {
    type: "array",
    items: itemSchema,
  };
}

/**
 * Select the root element for a stage based on the rootMode and root
 * @see BlockConfig.rootMode
 * @see BlockConfig.root
 */
function selectStageRoot(
  stage: BlockConfig,
  defaultRoot: ReaderRoot
): ReaderRoot {
  const rootMode = stage.rootMode ?? "inherit";

  const root = rootMode === "inherit" ? defaultRoot : document;
  const $root = $(root ?? document);

  // eslint-disable-next-line unicorn/no-array-callback-reference -- false positive for jQuery
  const $stageRoot = stage.root ? $root.find(stage.root) : $root;

  if ($stageRoot.length > 1) {
    throw new BusinessError(`Multiple roots found for ${stage.root}`);
  }

  if ($stageRoot.length === 0) {
    const rootDescriptor = (defaultRoot as HTMLElement).tagName ?? "document";
    throw new BusinessError(
      `No roots found for ${stage.root} (root=${rootDescriptor})`
    );
  }

  return $stageRoot.get(0);
}

/** Execute a pipeline of blocks and return the result. */
export async function reducePipeline(
  pipeline: BlockConfig | BlockPipeline,
  renderedArgs: RenderedArgs,
  logger: Logger,
  root: ReaderRoot = null,
  {
    runId = uuidv4(),
    validate = true,
    // Don't default `logValues`, will set async below using `getLoggingConfig` if not provided
    logValues,
    headless = false,
    optionsArgs = {},
    serviceArgs = {},
    // Default to the `apiVersion: v1, v2` data passing behavior and renderer behavior
    explicitArg = false,
    explicitRender = false,
    // Default to the `apiVersion: v1` data flow behavior
    explicitDataFlow = false,
  }: ReduceOptions = {}
): Promise<unknown> {
  const extraContext: RenderedArgs = {
    "@input": renderedArgs,
    ...serviceArgs,
    "@options": optionsArgs,
  };

  // If logValues not provided explicitly, default to the global setting
  if (logValues === undefined) {
    logValues = (await getLoggingConfig()).logValues ?? false;
  }

  // When using explicit data flow, the arguments come from `@input`
  let currentArgs: RenderedArgs = explicitDataFlow ? {} : renderedArgs;

  const pipelineArray = castArray(pipeline);

  for (const [index, stage] of pipelineArray.entries()) {
    const isFinalStage = index === pipelineArray.length - 1;
    const stageContext: MessageContext = {
      blockId: stage.id,
      label: stage.label,
    };
    const stageLogger = logger.childLogger(stageContext);

    try {
      const stageRoot = selectStageRoot(stage, root);

      if ("if" in stage) {
        const render = explicitRender
          ? null
          : await engineRenderer(stage.templateEngine);

        const { if: condition } = (await mapArgs(
          { if: stage.if },
          { ...extraContext, ...currentArgs },
          { implicitRender: render }
        )) as { if: unknown };

        if (!boolean(condition)) {
          logger.debug(
            `Skipping stage #${index + 1} ${stage.id} because condition not met`
          );
          continue;
        }
      }

      const block = await blockRegistry.lookup(stage.id);
      const blockType = await getType(block);

      const output = await runStage(block, stage, currentArgs, {
        root: stageRoot,
        context: extraContext,
        logValues,
        validate,
        headless,
        explicitArg,
        explicitRender,
        logger: stageLogger,
        trace: {
          runId,
          blockInstanceId: stage.instanceId,
        },
      });

      if (logValues) {
        console.info(`Output for block #${index + 1}: ${stage.id}`, {
          output,
          outputKey: stage.outputKey ? `@${stage.outputKey}` : null,
        });

        logger.debug(`Output for block #${index + 1}: ${stage.id}`, {
          output,
          outputKey: stage.outputKey ? `@${stage.outputKey}` : null,
        });
      }

      void recordTraceExit({
        runId,
        extensionId: logger.context.extensionId,
        blockId: stage.id,
        blockInstanceId: stage.instanceId,
        outputKey: stage.outputKey,
        output: output as JsonObject,
      });

      if (validate && !isEmpty(block.outputSchema)) {
        const baseSchema = castSchema(block.outputSchema);
        const validationResult = await validateOutput(
          stage.window === "broadcast" ? arraySchema(baseSchema) : baseSchema,
          excludeUndefined(output)
        );
        if (!validationResult.valid) {
          // For now, don't halt execution on output schema violation. If the output is malformed in a way that
          // prevents the next block from executing, the input validation check will fail
          logger.error(
            new OutputValidationError(
              "Invalid outputs for block",
              block.outputSchema,
              output,
              validationResult.errors
            )
          );
        }
      }

      if (blockType === "effect") {
        if (stage.outputKey) {
          logger.warn(`Ignoring output key for effect ${block.id}`);
        }

        if (output != null) {
          console.warn(`Effect ${block.id} produced an output`, { output });
          logger.warn(`Ignoring output produced by effect ${block.id}`);
        }
      } else if (stage.outputKey) {
        extraContext[`@${stage.outputKey}`] = output;
      } else if (isFinalStage || !explicitDataFlow) {
        currentArgs = output as any;
      } else if (explicitDataFlow) {
        // Force correct use of outputKey in `apiVersion: v2` usage
        throw new BusinessError(
          "outputKey is required for blocks that return data"
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch
    } catch (error) {
      if (error instanceof HeadlessModeError) {
        // An "expected" error, let the caller deal with it
        throw error;
      }

      void recordTraceExit({
        runId,
        extensionId: logger.context.extensionId,
        blockId: stage.id,
        blockInstanceId: stage.instanceId,
        error: serializeError(error),
      });

      if (stage.onError?.alert) {
        if (logger.context.deploymentId) {
          void sendDeploymentAlert({
            deploymentId: logger.context.deploymentId,
            data: {
              id: stage.id,
              args: currentArgs,
              error: serializeError(error),
            },
          });
        } else {
          console.warn("Can only send alert from deployment context");
        }
      }

      throw new ContextError(
        error,
        stageContext,
        `An error occurred running pipeline stage #${index + 1}: ${stage.id}`
      );
    }
  }

  return currentArgs;
}

/** Instantiate a reader from a reader configuration. */
export async function mergeReaders(
  readerConfig: ReaderConfig
): Promise<IReader> {
  if (typeof readerConfig === "string") {
    return blockRegistry.lookup(readerConfig) as Promise<IReader>;
  }

  if (Array.isArray(readerConfig)) {
    return new ArrayCompositeReader(
      await Promise.all(readerConfig.map(async (x) => mergeReaders(x)))
    );
  }

  if (isPlainObject(readerConfig)) {
    return new CompositeReader(
      await resolveObj(mapValues(readerConfig, mergeReaders))
    );
  }

  throw new BusinessError("Unexpected value for readerConfig");
}

export type ServiceContext = Record<
  OutputKey,
  {
    __service: SanitizedServiceConfiguration;
    [prop: string]: string | SanitizedServiceConfiguration | null;
  }
>;

/** Build the service context by locating the dependencies */
export async function makeServiceContext(
  dependencies: ServiceDependency[]
): Promise<ServiceContext> {
  const dependencyContext = async (dependency: ServiceDependency) => {
    const configuredService = await locate(dependency.id, dependency.config);
    return {
      // Our JSON validator gets mad at undefined values
      ...pickBy(configuredService.config, (x) => x !== undefined),
      __service: configuredService,
    };
  };

  return resolveObj(
    Object.fromEntries(
      dependencies.map((dependency) => [
        `@${dependency.outputKey}`,
        dependencyContext(dependency),
      ])
    )
  );
}
