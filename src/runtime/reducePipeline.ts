/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import {
  BlockArg,
  BlockArgContext,
  Logger,
  ReaderRoot,
  RenderedArgs,
  ServiceContext,
  UserOptions,
  UUID,
} from "@/core";
import { castArray, isPlainObject } from "lodash";
import { BusinessError, ContextError } from "@/errors";
import {
  clearExtensionDebugLogs,
  getLoggingConfig,
  requestRun,
  sendDeploymentAlert,
  traces,
} from "@/background/messenger/api";
import { hideNotification, showNotification } from "@/utils/notify";
import { serializeError } from "serialize-error";
import { HeadlessModeError } from "@/blocks/errors";
import { engineRenderer } from "@/runtime/renderers";
import { TraceExitData, TraceRecordMeta } from "@/telemetry/trace";
import { JsonObject } from "type-fest";
import { uuidv4 } from "@/types/helpers";
import { mapArgs } from "@/runtime/mapArgs";
import {
  ApiVersionOptions,
  DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
} from "@/runtime/apiVersionOptions";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import {
  logIfInvalidOutput,
  selectBlockRootElement,
  shouldRunBlock,
  throwIfInvalidInput,
} from "@/runtime/runtimeUtils";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { ResolvedBlockConfig } from "@/runtime/runtimeTypes";
import { UnknownObject } from "@/types";
import { RunBlock } from "@/contentScript/runBlockTypes";
import { resolveBlockConfig } from "@/blocks/registry";

type CommonOptions = ApiVersionOptions & {
  /**
   * `true` to log all block inputs to the context-aware logger.
   *
   * The user toggles this setting on the Settings page
   * @see SettingsPage
   */
  logValues: boolean;
  /**
   * The context-aware logger
   */
  logger: Logger;
  /**
   * `true` to throw an error if a renderer is encountered. Used to abort execution in the contentScript to pass
   * data over to be rendered in a PixieBrix sidebar sidebar.
   */
  headless: boolean;
};

export type ReduceOptions = CommonOptions & {
  /**
   * UUID to correlate trace records for a brick
   */
  runId: UUID;
};

export type InitialValues = {
  /**
   * The inputs to the BrickPipeline, e.g., from the foundation's readers. Are placed under the `@input` key
   * @see IExtensionPoint.defaultReader
   */
  input: UnknownObject;
  /**
   * Option values provided by the user during activation of an extension
   * @see IExtension.optionsArgs
   */
  optionsArgs: UserOptions;
  /**
   * Service credentials provided by the user during activation of an extension
   * @see IExtension.services
   */
  serviceContext: ServiceContext;
  /**
   * The document root for root-aware bricks, including readers
   * @see IBlock.isRootAware
   */
  root: ReaderRoot | null;
};

export type IntermediateState = {
  /**
   * The data passed implicitly from the previous block in the pipeline
   * @see ApiVersionOptions.explicitDataFlow
   * @deprecated since `apiVersion: 2` data is passed explicitly via the context and outputKeys
   */
  previousOutput: unknown;
  /**
   * The context available to the brick. Contains `@inputs`, `@options`, and the other entries accumulated so far from
   * the previous bricks' output keys.
   * @see BlockConfig.outputKey
   */
  context: BlockArgContext;
  /**
   * The document root for root-aware bricks
   * @see IBlock.isRootAware
   */
  root: ReaderRoot | null;
  /**
   * The stage's position in the BlockPipeline. Used to improve logging and error messages
   * @see BlockPipeline
   */
  index: number;
  /**
   * `true` if the stage is the last stage in the pipeline, for logging and validation
   * @see BlockPipeline
   */
  isLastBlock: boolean;
};

/**
 * All of the data that determine the execution behavior of a block
 * @see IBlock.run
 */
type BlockProps<TArgs extends RenderedArgs | BlockArg = RenderedArgs> = {
  /**
   * The rendered args for the block, which may or may not have been already validated against the inputSchema depending
   * on the static type.
   */
  args: TArgs;

  /**
   * The available context (The context used to render the args.)
   */
  context: BlockArgContext;

  /**
   * The previous output
   * @deprecated ignored since v2
   */
  previousOutput: unknown;

  /**
   * The root for root-aware blocks
   * @see IBlock.isRootAware
   */
  root: ReaderRoot | null;
};

type BlockOutput = {
  /**
   * The output of the block to pass to the next block. If a block uses an outputKey, output will be the output of the
   * previous block in the BlockPipeline.
   */
  output: unknown;

  /**
   * The updated context, i.e., with the new outputKey.
   * @see BlockConfig.outputKey
   */
  context: BlockArgContext;
};

type TraceMetadata = {
  /**
   * @see ReduceOptions.runId
   */
  runId: UUID;
  /**
   * The instanceId of the configured block
   * @see BlockConfig.instanceId
   */
  blockInstanceId: UUID;
};

type RunBlockOptions = CommonOptions & {
  /**
   * Additional context to record with the trace entry/exit records.
   */
  trace: TraceMetadata | null;
};

async function execute(
  { config, block }: ResolvedBlockConfig,
  { args, context, root, previousOutput }: BlockProps<BlockArg>,
  options: RunBlockOptions
): Promise<unknown> {
  const commonOptions = {
    // This condition of what to pass to the brick is wacky, but seemingly necessary to replicate behavior in v1 where
    // if the previous brick output an array, the array would be passed as the context to the next brick.
    // See the corresponding hack/condition in renderBlockArg
    ctxt:
      options.explicitArg || isPlainObject(previousOutput)
        ? context
        : previousOutput,
    messageContext: options.logger.context,
  };

  const request: RunBlock = {
    blockId: config.id,
    blockArgs: args,
    options: commonOptions,
  };

  switch (config.window ?? "self") {
    case "opener": {
      return requestRun.inOpener(request);
    }

    case "target": {
      return requestRun.inTarget(request);
    }

    case "broadcast": {
      return requestRun.inAll(request);
    }

    case "remote": {
      return requestRun.onServer(request);
    }

    case "self": {
      return block.run(args, {
        ...commonOptions,
        ...options,
        root,
      });
    }

    default: {
      throw new BusinessError(`Unexpected stage window ${config.window}`);
    }
  }
}

async function renderBlockArg(
  resolvedConfig: ResolvedBlockConfig,
  state: IntermediateState,
  options: RunBlockOptions
): Promise<RenderedArgs> {
  const { config, type } = resolvedConfig;

  const {
    // If logValues not provided explicitly, default to the global setting
    logValues = (await getLoggingConfig()).logValues ?? false,
    logger,
    explicitArg,
    explicitDataFlow,
    explicitRender,
    autoescape,
  } = options;

  // Support YAML short-hand of leaving of `config:` directive for blocks that don't have parameters
  const stageTemplate = config.config ?? {};

  if (type === "reader") {
    // `reducePipeline` is responsible for passing the correct root into runStage based on the BlockConfig
    if ((config.window ?? "self") === "self") {
      logger.debug(
        `Passed root to reader ${config.id} (window=${config.window ?? "self"})`
      );

      return { root: state.root } as unknown as RenderedArgs;
    }

    // TODO: allow non-document roots in other tabs
    // By not setting the root, the other tab's document is user
    logger.debug(
      `Passed blank root to reader ${config.id} (window=${
        config.window ?? "self"
      })`
    );

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- nominal type for literal
    return {} as RenderedArgs;
  }

  if (!explicitArg && !isPlainObject(state.previousOutput)) {
    // V1 LEGACY HACK: hack from legacy versions to avoid applying calling Mustache.render or another renderer with a
    // context that's not an object. Pass through the config directly without rendering.
    return config.config as RenderedArgs;
  }

  // Match the override behavior in v1, where the output from previous block would override anything in the context
  const ctxt = explicitDataFlow
    ? state.context
    : { ...state.context, ...(state.previousOutput as UnknownObject) };

  const implicitRender = explicitRender
    ? null
    : await engineRenderer(
        config.templateEngine ?? DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
        { autoescape }
      );

  const blockArgs = (await mapArgs(stageTemplate, ctxt, {
    implicitRender,
    autoescape,
  })) as RenderedArgs;

  if (logValues) {
    logger.debug(
      `Input for block ${config.id} (window=${config.window ?? "self"})`,
      {
        id: config.id,
        template: stageTemplate,
        templateContext: state.context,
        renderedArgs: blockArgs,
      }
    );
  }

  return blockArgs;
}

function selectTraceRecordMeta(
  resolvedConfig: ResolvedBlockConfig,
  options: RunBlockOptions
): TraceRecordMeta {
  return {
    ...options.trace,
    blockId: resolvedConfig.config.id,
    extensionId: options.logger.context.extensionId,
  };
}

export async function runBlock(
  resolvedConfig: ResolvedBlockConfig,
  props: BlockProps,
  options: RunBlockOptions
): Promise<unknown> {
  const { validateInput, logger, headless } = options;

  const { config: stage, block, type } = resolvedConfig;

  if (validateInput) {
    await throwIfInvalidInput(block, props.args);
  }

  let notification: string;

  if (stage.notifyProgress) {
    notification = showNotification({
      message: stage.label ?? block.name,
      type: "loading",
    });
  }

  if (type === "renderer" && headless) {
    throw new HeadlessModeError(
      block.id,
      props.args,
      props.context,
      logger.context
    );
  }

  try {
    // Inputs validated in throwIfInvalidInput
    const validatedProps = props as unknown as BlockProps<BlockArg>;
    return await execute(resolvedConfig, validatedProps, options);
  } finally {
    if (stage.notifyProgress) {
      hideNotification(notification);
    }
  }
}

async function applyReduceDefaults({
  logValues,
  runId,
  logger,
  ...overrides
}: Partial<ReduceOptions>): Promise<ReduceOptions> {
  return {
    validateInput: true,
    headless: false,
    // Default to the `apiVersion: v1, v2` data passing behavior and renderer behavior
    explicitArg: false,
    explicitRender: false,
    autoescape: true,
    // Default to the `apiVersion: v1` data flow behavior
    explicitDataFlow: false,
    // If logValues not provided explicitly, default to the global setting
    logValues:
      logValues === undefined
        ? (await getLoggingConfig()).logValues ?? false
        : logValues,
    // For stylistic consistency, default here instead of destructured parameters
    runId: runId ?? uuidv4(),
    logger: logger ?? new ConsoleLogger(),
    ...overrides,
  };
}

export async function blockReducer(
  blockConfig: BlockConfig,
  state: IntermediateState,
  options: ReduceOptions
): Promise<BlockOutput> {
  const { index, isLastBlock, previousOutput, context, root } = state;
  const { runId, explicitDataFlow, logValues, logger } = options;

  // Match the override behavior in v1, where the output from previous block would override anything in the context
  const contextWithPreviousOutput =
    explicitDataFlow || !isPlainObject(previousOutput)
      ? context
      : { ...context, ...(previousOutput as UnknownObject) };

  const resolvedConfig = await resolveBlockConfig(blockConfig);

  const optionsWithTraceRef = {
    ...options,
    trace: {
      runId,
      blockInstanceId: blockConfig.instanceId,
    },
  };

  // Adjust the root according to the `root` and `rootMode` props on the blockConfig
  const blockRoot = selectBlockRootElement(blockConfig, root);

  let renderedArgs: RenderedArgs;
  let renderError: unknown;
  try {
    renderedArgs = await renderBlockArg(
      resolvedConfig,
      { ...state, root: blockRoot },
      optionsWithTraceRef
    );
  } catch (error) {
    renderError = error;
  }

  // Always add the trace entry, even if the block didn't run
  traces.addEntry({
    // Pass blockOptions because it includes the trace property
    ...selectTraceRecordMeta(resolvedConfig, optionsWithTraceRef),
    timestamp: new Date().toISOString(),
    templateContext: context as JsonObject,
    renderError: renderError ? serializeError(renderError) : null,
    // `renderedArgs` will be null if there's an error rendering args
    renderedArgs,
    blockConfig,
  });

  const preconfiguredTraceExit: TraceExitData = {
    runId,
    extensionId: logger.context.extensionId,
    blockId: blockConfig.id,
    blockInstanceId: blockConfig.instanceId,
    outputKey: blockConfig.outputKey,
    output: null,
    skippedRun: false,
  };

  if (
    !(await shouldRunBlock(blockConfig, contextWithPreviousOutput, options))
  ) {
    logger.debug(`Skipping stage ${blockConfig.id} because condition not met`);

    traces.addExit({
      ...preconfiguredTraceExit,
      output: null,
      skippedRun: true,
    });

    return { output: previousOutput, context };
  }

  // Above we had wrapped the call to renderBlockArg in a try-catch to always have an entry trace entry
  if (renderError) {
    throw renderError;
  }

  const props: BlockProps = {
    args: renderedArgs,
    root: blockRoot,
    previousOutput,
    context: contextWithPreviousOutput,
  };

  const output = await runBlock(resolvedConfig, props, optionsWithTraceRef);

  if (logValues) {
    console.info(`Output for block #${index + 1}: ${blockConfig.id}`, {
      output,
      outputKey: blockConfig.outputKey ? `@${blockConfig.outputKey}` : null,
    });

    logger.debug(`Output for block #${index + 1}: ${blockConfig.id}`, {
      output,
      outputKey: blockConfig.outputKey ? `@${blockConfig.outputKey}` : null,
    });
  }

  traces.addExit({
    ...preconfiguredTraceExit,
    output: output as JsonObject,
    skippedRun: false,
  });

  await logIfInvalidOutput(resolvedConfig.block, output, logger, {
    window: blockConfig.window,
  });

  if (resolvedConfig.type === "effect") {
    if (blockConfig.outputKey) {
      logger.warn(`Ignoring output key for effect ${blockConfig.id}`);
    }

    if (output != null) {
      console.warn(`Effect ${blockConfig.id} produced an output`, { output });
      logger.warn(`Ignoring output produced by effect ${blockConfig.id}`);
    }

    return { output: previousOutput, context };
  }

  if (blockConfig.outputKey) {
    return {
      output: previousOutput,
      context: {
        ...context,
        // Keys overwrite any previous keys with the same name
        [`@${blockConfig.outputKey}`]: output,
      },
    };
  }

  if (!isLastBlock && explicitDataFlow) {
    // Force correct use of outputKey in `apiVersion: v2` usage
    throw new BusinessError(
      "outputKey is required for blocks that return data (since apiVersion: v2)"
    );
  }

  return { output, context };
}

function throwBlockError(
  blockConfig: BlockConfig,
  state: IntermediateState,
  error: unknown,
  options: ReduceOptions
) {
  const { index, context } = state;

  const { runId, logger } = options;

  if (error instanceof HeadlessModeError) {
    // An "expected" error, let the caller deal with it
    throw error;
  }

  traces.addExit({
    runId,
    extensionId: logger.context.extensionId,
    blockId: blockConfig.id,
    blockInstanceId: blockConfig.instanceId,
    error: serializeError(error),
    skippedRun: false,
  });

  if (blockConfig.onError?.alert) {
    // An affordance to send emails to allow for manual process recovery if a step fails (e.g., an API call to a
    // transaction queue fails)
    if (logger.context.deploymentId) {
      sendDeploymentAlert({
        deploymentId: logger.context.deploymentId,
        data: {
          id: blockConfig.id,
          context,
          error: serializeError(error),
        },
      });
    } else {
      logger.warn("Can only send alert from deployment context");
    }
  }

  throw new ContextError(
    `An error occurred running pipeline stage #${index + 1}: ${blockConfig.id}`,
    {
      cause: error,
      context: logger.context,
    }
  );
}

/** Execute all the blocks of an extension. */
export async function reduceExtensionPipeline(
  pipeline: BlockConfig | BlockPipeline,
  initialValues: InitialValues,
  partialOptions: Partial<ReduceOptions> = {}
): Promise<unknown> {
  const pipelineLogger = partialOptions.logger ?? new ConsoleLogger();

  // `await` promises to avoid race condition where the calls here delete debug entries from this call to reducePipeline
  await Promise.allSettled([
    traces.clear(pipelineLogger.context.extensionId),
    clearExtensionDebugLogs(pipelineLogger.context.extensionId),
  ]);

  return reducePipeline(pipeline, initialValues, partialOptions);
}

/** Execute a pipeline of blocks and return the result. */
export async function reducePipeline(
  pipeline: BlockConfig | BlockPipeline,
  initialValues: InitialValues,
  partialOptions: Partial<ReduceOptions> = {}
): Promise<unknown> {
  const options = await applyReduceDefaults(partialOptions);

  const { input, root, serviceContext, optionsArgs } = initialValues;

  const { explicitDataFlow, logger: pipelineLogger } = options;

  let context: BlockArgContext = {
    // Put serviceContext first so they can't override the input/options
    ...serviceContext,
    "@input": input,
    "@options": optionsArgs ?? {},
  } as unknown as BlockArgContext;

  // When using explicit data flow, the first block (and other blocks) use `@input` in the context to get the inputs
  let output: unknown = explicitDataFlow ? {} : input;

  const pipelineArray = castArray(pipeline);

  for (const [index, blockConfig] of pipelineArray.entries()) {
    const state: IntermediateState = {
      root,
      index,
      isLastBlock: index === pipelineArray.length - 1,
      previousOutput: output,
      context,
    };

    const stageLogger = pipelineLogger.childLogger({
      blockId: blockConfig.id,
      label: blockConfig.label,
    });

    let nextValues: BlockOutput;

    try {
      // eslint-disable-next-line no-await-in-loop -- can't parallelize because each step depends on previous step
      nextValues = await blockReducer(blockConfig, state, {
        ...options,
        logger: stageLogger,
      });
    } catch (error) {
      throwBlockError(blockConfig, state, error, options);
    }

    output = nextValues.output;
    context = nextValues.context;
  }

  return output;
}
