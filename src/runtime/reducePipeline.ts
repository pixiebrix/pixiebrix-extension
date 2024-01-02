/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type Logger } from "@/types/loggerTypes";
import { castArray, isPlainObject, once } from "lodash";
import {
  clearExtensionDebugLogs,
  requestRun,
  sendDeploymentAlert,
  traces,
} from "@/background/messenger/api";
import { hideNotification, showNotification } from "@/utils/notify";
import { serializeError } from "serialize-error";
import { HeadlessModeError } from "@/bricks/errors";
import { engineRenderer } from "@/runtime/renderers";
import { type TraceExitData, type TraceRecordMeta } from "@/telemetry/trace";
import { type JsonObject } from "type-fest";
import { uuidv4, validateSemVerString } from "@/types/helpers";
import { mapArgs } from "@/runtime/mapArgs";
import {
  type ApiVersionOptions,
  DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
} from "@/runtime/apiVersionOptions";
import {
  type BrickConfig,
  type BrickPipeline,
  hasMultipleTargets,
} from "@/bricks/types";
import {
  logIfInvalidOutput,
  selectBlockRootElement,
  shouldRunBlock,
  throwIfInvalidInput,
} from "@/runtime/runtimeUtils";
import ConsoleLogger from "@/utils/ConsoleLogger";
import {
  type ResolvedBrickConfig,
  unsafeAssumeValidArg,
} from "@/runtime/runtimeTypes";
import { type RunBrickRequest } from "@/contentScript/messenger/runBrickTypes";
import {
  BusinessError,
  CancelError,
  NoRendererError,
} from "@/errors/businessErrors";
import { ContextError } from "@/errors/genericErrors";
import { type PanelPayload } from "@/types/sidebarTypes";
import { loggingConfig } from "@/telemetry/logging";
import { type UUID } from "@/types/stringTypes";
import {
  type BrickArgs,
  type BrickArgsContext,
  type SelectorRoot,
  type RenderedArgs,
  type ServiceContext,
  type OptionsArgs,
  type PipelineExpression,
  type RunMetadata,
} from "@/types/runtimeTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { isPipelineClosureExpression } from "@/utils/expressionUtils";
import extendModVariableContext from "@/runtime/extendModVariableContext";
import { isObject } from "@/utils/objectUtils";
import { type RegistryProtocol } from "@/registry/memoryRegistry";
import { type RegistryId } from "@/types/registryTypes";
import { type Brick } from "@/types/brickTypes";
import getType from "@/runtime/getType";

// Introduce a layer of indirection to avoid cyclical dependency between runtime and registry
let brickRegistry: RegistryProtocol<RegistryId, Brick> = {
  async lookup(): Promise<Brick> {
    throw new Error(
      "Runtime was not initialized. Call initRuntime before running mods.",
    );
  },
};

/**
 * Initialize the runtime with the given brick registry.
 * @param registry brick registry to use for looking up bricks
 * @since 1.8.2 introduced to eliminate circular dependency between runtime and registry
 */
export function initRuntime(
  registry: RegistryProtocol<RegistryId, Brick>,
): void {
  brickRegistry = registry;
}

/**
 * CommonOptions for running pipelines and blocks
 */
type CommonOptions = ApiVersionOptions & {
  /**
   * `true` to log all brick inputs to the context-aware logger.
   *
   * The user toggles this setting on the Settings page
   * @see SettingsPage
   */
  logValues: boolean;
  /**
   * The context-aware logger.
   */
  logger: Logger;
  /**
   * `true` to throw an error if a renderer is encountered. Used to abort execution in the contentScript to pass
   * data over to be rendered in a PixieBrix sidebar.
   */
  headless: boolean;
  /**
   * An optional signal to abort the pipeline.
   * @since 1.7.19
   */
  abortSignal?: AbortSignal;
};

export type ReduceOptions = CommonOptions & RunMetadata;

export type InitialValues = {
  /**
   * The inputs to the BrickPipeline, e.g., from the foundation's readers. Are placed under the `@input` key
   * @see StarterBrick.defaultReader
   */
  input: UnknownObject;
  /**
   * Option values provided by the user during activation of an extension
   * @see ModComponentBase.optionsArgs
   */
  optionsArgs: OptionsArgs;
  /**
   * Service credentials provided by the user during activation of an extension
   * @see ModComponentBase.services
   */
  serviceContext: ServiceContext;
  /**
   * The document root for root-aware bricks, including readers
   * @see Brick.isRootAware
   */
  root: SelectorRoot | null;
};

export type IntermediateState = {
  /**
   * The data passed implicitly from the previous brick in the pipeline
   * @see ApiVersionOptions.explicitDataFlow
   * @deprecated since `apiVersion: 2` data is passed explicitly via the context and outputKeys
   */
  previousOutput: unknown;
  /**
   * The context available to the brick. Contains `@inputs`, `@options`, and the other entries accumulated so far from
   * the previous bricks' output keys.
   * @see BrickConfig.outputKey
   */
  context: BrickArgsContext;
  /**
   * The document root for root-aware bricks
   * @see Brick.isRootAware
   */
  root: SelectorRoot | null;
  /**
   * The stage's position in the BrickPipeline. Used to improve logging and error messages
   * @see BrickPipeline
   */
  index: number;
  /**
   * `true` if the stage is the last stage in the pipeline, for logging and validation
   * @see BrickPipeline
   */
  isLastBlock: boolean;
};

/**
 * All the data that determine the execution behavior of a brick
 * @see Brick.run
 */
type BlockProps<TArgs extends RenderedArgs | BrickArgs = RenderedArgs> = {
  /**
   * The rendered args for the brick, which may or may not have been already validated against the inputSchema depending
   * on the static type.
   */
  args: TArgs;

  /**
   * The available context (The context used to render the args.)
   */
  context: BrickArgsContext;

  /**
   * The previous output
   * @deprecated ignored since v2
   */
  previousOutput: unknown;

  /**
   * The root for root-aware bricks
   * @see Brick.isRootAware
   */
  root: SelectorRoot | null;
};

type BlockOutput = {
  /**
   * The output of the brick to pass to the next brick. If a brick uses an outputKey, output will be the output of the
   * previous brick in the BrickPipeline.
   */
  output: unknown;

  /**
   * The output of the brick (even if it has an outputKey)
   * @since 1.7.0
   */
  blockOutput: unknown;

  /**
   * The updated context, i.e., with the new outputKey.
   * @see BrickConfig.outputKey
   */
  context: BrickArgsContext;
};

interface TraceMetadata extends RunMetadata {
  /**
   * The instanceId of the configured brick, or null if the brick is not running from the Page Editor.
   *
   * The blockInstanceId is used to correlate trace records for the same brick across runs/branches.
   *
   * @see BrickConfig.instanceId
   */
  blockInstanceId: UUID | null;
}

type RunBlockOptions = CommonOptions & {
  /**
   * Additional context to record with the trace entry/exit records.
   */
  trace: TraceMetadata;
};

/**
 * Get the lexical environment for running a pipeline. Currently, we're just tracking on the pipeline arg itself.
 * https://en.wikipedia.org/wiki/Closure_(computer_programming)
 *
 * @see ExternalBlock.initPipelineClosures
 */
function getPipelineLexicalEnvironment({
  pipeline,
  ctxt,
  extraContext,
}: {
  pipeline: PipelineExpression;
  ctxt: UnknownObject;
  extraContext: UnknownObject | null;
}): UnknownObject {
  if (isPipelineClosureExpression(pipeline)) {
    return {
      ...pipeline.__env__,
      ...extraContext,
    };
  }

  return {
    ...ctxt,
    ...extraContext,
  };
}

export async function resolveBlockConfig(
  config: BrickConfig,
): Promise<ResolvedBrickConfig> {
  const block = await brickRegistry.lookup(config.id);
  return {
    config,
    block,
    type: await getType(block),
  };
}

/**
 * Execute/run the resolved brick in the target (self, etc.) with the validated args.
 */
async function executeBlockWithValidatedProps(
  { config, block }: ResolvedBrickConfig,
  { args, context, root, previousOutput }: BlockProps<BrickArgs>,
  options: RunBlockOptions,
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

  const request: RunBrickRequest = {
    blockId: config.id,
    blockArgs: args,
    options: {
      ...commonOptions,
      meta: options.trace,
    },
  };

  switch (config.window ?? "self") {
    case "opener": {
      return requestRun.inOpener(request);
    }

    case "target": {
      return requestRun.inTarget(request);
    }

    case "top": {
      return requestRun.inTop(request);
    }

    case "broadcast": {
      return requestRun.inOtherTabs(request);
    }

    case "all_frames": {
      return requestRun.inAllFrames(request);
    }

    case "self": {
      const { runId, extensionId, branches } = options.trace;

      return block.run(args, {
        ...commonOptions,
        ...options,
        meta: {
          extensionId,
          runId,
          branches,
        },
        root,
        async runPipeline(pipeline, branch, extraContext, rootOverride) {
          if (!isObject(commonOptions.ctxt)) {
            throw new Error("Expected object context for v3+ runtime");
          }

          return reducePipelineExpression(
            pipeline?.__value__ ?? [],
            getPipelineLexicalEnvironment({
              pipeline,
              ctxt: commonOptions.ctxt,
              extraContext,
            }),
            rootOverride ?? root,
            {
              ...options,
              runId,
              extensionId,
              branches: [...branches, branch],
            },
          );
        },
        /**
         * Renderers need to be run with try-catch, catch the HeadlessModeError, and
         * use that to send the panel payload to the sidebar (or other target)
         * @see runRendererBlock
         * @see SidebarExtensionPoint
         *  starting on line 184, the call to reduceExtensionPipeline(),
         *  wrapped in a try-catch
         */
        async runRendererPipeline(
          pipeline,
          branch,
          extraContext,
          rootOverride,
        ) {
          if (!isObject(commonOptions.ctxt)) {
            throw new Error("Expected object context for v3+ runtime");
          }

          const { runId, extensionId, branches } = options.trace;
          let payload: PanelPayload;
          try {
            await reducePipelineExpression(
              pipeline?.__value__ ?? [],
              getPipelineLexicalEnvironment({
                pipeline,
                ctxt: commonOptions.ctxt,
                extraContext,
              }),
              rootOverride ?? root,
              {
                ...options,
                // This (headless) is the important difference from the call in runPipeline() above
                headless: true,
                runId,
                extensionId,
                branches: [...branches, branch],
              },
            );
            // We're expecting a HeadlessModeError (or other error) to be thrown in the line above
            // noinspection ExceptionCaughtLocallyJS
            throw new NoRendererError();
          } catch (error) {
            if (error instanceof HeadlessModeError) {
              payload = {
                key: runId,
                blockId: error.blockId,
                args: error.args,
                ctxt: error.ctxt,
                extensionId,
                runId,
              };
            } else {
              payload = {
                key: runId,
                error: serializeError(error),
                extensionId,
                runId,
              };
            }
          }

          return payload;
        },
      });
    }

    default: {
      throw new BusinessError(`Unexpected stage window ${config.window}`);
    }
  }
}

async function renderBlockArg(
  resolvedConfig: ResolvedBrickConfig,
  state: IntermediateState,
  options: RunBlockOptions,
): Promise<RenderedArgs> {
  const { config, type } = resolvedConfig;

  const globalLoggingConfig = await loggingConfig.get();

  const {
    // If logValues not provided explicitly, default to the global setting
    logValues = globalLoggingConfig.logValues ?? false,
    logger,
    explicitArg,
    explicitDataFlow,
    explicitRender,
    autoescape,
  } = options;

  // Support YAML shorthand of leaving of `config:` directive for bricks that don't have parameters
  const stageTemplate = config.config ?? {};

  if (type === "reader") {
    // `reducePipeline` is responsible for passing the correct root into runStage based on the BrickConfig
    if ((config.window ?? "self") === "self") {
      return { root: state.root } as unknown as RenderedArgs;
    }

    // TODO: allow non-document roots in other tabs
    // By not setting the root, the other tab's document is user
    logger.debug(
      `Passed blank root to reader ${config.id} (window=${
        config.window ?? "self"
      })`,
    );

    return {} as RenderedArgs;
  }

  if (!explicitArg && !isPlainObject(state.previousOutput)) {
    // V1 LEGACY HACK: hack from legacy versions to avoid applying calling Mustache.render or another renderer with a
    // context that's not an object. Pass through the config directly without rendering.
    return config.config as RenderedArgs;
  }

  // Match the override behavior in v1, where the output from previous brick would override anything in the context
  const ctxt = explicitDataFlow
    ? state.context
    : { ...state.context, ...(state.previousOutput as UnknownObject) };

  const implicitRender = explicitRender
    ? null
    : engineRenderer(
        config.templateEngine ?? DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
        { autoescape },
      );

  const blockArgs = (await mapArgs(stageTemplate, ctxt, {
    implicitRender,
    autoescape,
  })) as RenderedArgs;

  if (logValues) {
    logger.debug(
      `Input for brick ${config.id} (window=${config.window ?? "self"})`,
      {
        id: config.id,
        template: stageTemplate,
        templateContext: state.context,
        renderedArgs: blockArgs,
      },
    );
  }

  return blockArgs;
}

function selectTraceRecordMeta(
  resolvedConfig: ResolvedBrickConfig,
  options: RunBlockOptions,
): TraceRecordMeta {
  return {
    ...options.trace,
    blockId: resolvedConfig.config.id,
  };
}

/**
 * Return true if tracing is enabled based on the given tracing options
 * @see traces.addEntry
 * @see traces.addExit
 */
function selectTraceEnabled({
  runId,
  blockInstanceId,
}: Pick<TraceMetadata, "runId" | "blockInstanceId">): boolean {
  return Boolean(runId) && Boolean(blockInstanceId);
}

export async function runBlock(
  resolvedConfig: ResolvedBrickConfig,
  props: BlockProps,
  options: RunBlockOptions,
): Promise<unknown> {
  const { validateInput, logger, headless, trace } = options;

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
    if (selectTraceEnabled(trace)) {
      traces.addExit({
        ...trace,
        extensionId: logger.context.extensionId,
        blockId: block.id,
        isFinal: true,
        isRenderer: true,
        error: null,
        output: null,
        skippedRun: false,
      });
    }

    throw new HeadlessModeError(
      block.id,
      // Call to throwIfInvalidInput above ensures args are valid for the brick
      unsafeAssumeValidArg(props.args),
      props.context,
      logger.context,
    );
  }

  try {
    // Inputs validated in throwIfInvalidInput
    const validatedProps = props as unknown as BlockProps<BrickArgs>;
    return await executeBlockWithValidatedProps(
      resolvedConfig,
      validatedProps,
      options,
    );
  } finally {
    if (stage.notifyProgress) {
      hideNotification(notification);
    }
  }
}

async function applyReduceDefaults({
  logValues,
  runId,
  extensionId,
  logger: providedLogger,
  ...overrides
}: Partial<ReduceOptions>): Promise<ReduceOptions> {
  const globalLoggingConfig = await loggingConfig.get();
  const logger = providedLogger ?? new ConsoleLogger();

  return {
    extensionId: extensionId ?? logger.context.extensionId,
    validateInput: true,
    headless: false,
    // Default to the `apiVersion: v1, v2` data passing behavior and renderer behavior
    explicitArg: false,
    explicitRender: false,
    autoescape: true,
    // Default to the `apiVersion: v1` data flow behavior and mod variable behavior
    explicitDataFlow: false,
    extendModVariable: false,
    // If logValues not provided explicitly, default to the global setting
    logValues: logValues ?? globalLoggingConfig.logValues ?? false,
    // For stylistic consistency, default here instead of destructured parameters
    branches: [],
    // NOTE: do not set runId here. It should be set by the starter brick explicitly, or implicitly generated
    // by reduceExtensionPipeline. If a caller intentionally unset the run id, setting it here would create
    // a new run id for the same extension id, which would cause a race condition in PixieBrix's detection
    // of the latest starter brick pipeline run.
    runId,
    logger,
    ...overrides,
  };
}

export async function blockReducer(
  blockConfig: BrickConfig,
  state: IntermediateState,
  options: ReduceOptions,
): Promise<BlockOutput> {
  const { index, isLastBlock, previousOutput, context, root } = state;
  const { runId, extensionId, explicitDataFlow, logValues, logger, branches } =
    options;

  // Match the override behavior in v1, where the output from previous brick would override anything in the context
  const contextWithPreviousOutput =
    explicitDataFlow || !isPlainObject(previousOutput)
      ? context
      : { ...context, ...(previousOutput as UnknownObject) };

  const resolvedConfig = await resolveBlockConfig(blockConfig);

  const optionsWithTraceRef = {
    ...options,
    trace: {
      runId,
      // Be defensive if the call site doesn't provide an extensionId
      // See: https://github.com/pixiebrix/pixiebrix-extension/issues/3751
      extensionId: extensionId ?? logger.context.extensionId,
      blockInstanceId: blockConfig.instanceId,
      branches,
    },
  };

  // Adjust the root according to the `root` and `rootMode` props on the blockConfig
  const blockRoot = await selectBlockRootElement(
    blockConfig,
    root,
    context,
    options,
  );

  let renderedArgs: RenderedArgs;
  let renderError: unknown;

  // Only renders the args if we need them
  const lazyRenderArgs = once(async () => {
    try {
      renderedArgs = await renderBlockArg(
        resolvedConfig,
        { ...state, root: blockRoot },
        optionsWithTraceRef,
      );
    } catch (error) {
      renderError = error;
    }
  });

  // // Pass blockOptions because it includes the trace property
  const traceMeta = selectTraceRecordMeta(resolvedConfig, optionsWithTraceRef);
  const traceEnabled = selectTraceEnabled(traceMeta);

  if (traceEnabled) {
    await lazyRenderArgs();

    // Always add the trace entry, even if the brick didn't run
    traces.addEntry({
      ...traceMeta,
      timestamp: new Date().toISOString(),
      templateContext: context as JsonObject,
      renderError: renderError ? serializeError(renderError) : null,
      // `renderedArgs` will be null if there's an error rendering args
      renderedArgs,
      blockConfig,
    });
  }

  const preconfiguredTraceExit: TraceExitData = {
    ...traceMeta,
    outputKey: blockConfig.outputKey,
    output: null,
    skippedRun: false,
    isRenderer: false,
    isFinal: true,
  };

  if (
    !(await shouldRunBlock(blockConfig, contextWithPreviousOutput, options))
  ) {
    logger.debug(`Skipping stage ${blockConfig.id} because condition not met`);

    if (traceEnabled) {
      traces.addExit({
        ...preconfiguredTraceExit,
        output: null,
        skippedRun: true,
      });
    }

    return { output: previousOutput, context, blockOutput: undefined };
  }

  // Render args for the run
  await lazyRenderArgs();

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
    console.info(`Output for brick #${index + 1}: ${blockConfig.id}`, {
      output,
      outputKey: blockConfig.outputKey ? `@${blockConfig.outputKey}` : null,
    });

    logger.debug(`Output for brick #${index + 1}: ${blockConfig.id}`, {
      output,
      outputKey: blockConfig.outputKey ? `@${blockConfig.outputKey}` : null,
    });
  }

  if (traceEnabled) {
    traces.addExit({
      ...preconfiguredTraceExit,
      output: output as JsonObject,
      skippedRun: false,
    });
  }

  await logIfInvalidOutput(resolvedConfig.block, output, logger, {
    window: blockConfig.window,
  });

  if (resolvedConfig.type === "effect") {
    if (blockConfig.outputKey) {
      logger.warn(`Ignoring output key for effect ${blockConfig.id}`);
    }

    // If run against multiple targets, the output at this point will be an array
    if (output != null && !hasMultipleTargets(resolvedConfig.config.window)) {
      console.warn(`Effect ${blockConfig.id} produced an output`, { output });
      logger.warn(`Ignoring output produced by effect ${blockConfig.id}`);
    }

    return { output: previousOutput, context, blockOutput: undefined };
  }

  if (blockConfig.outputKey) {
    return {
      output: previousOutput,
      context: {
        ...context,
        // Keys overwrite any previous keys with the same name
        [`@${blockConfig.outputKey}`]: output,
      },
      blockOutput: output,
    };
  }

  if (!isLastBlock && explicitDataFlow) {
    // Force correct use of outputKey in `apiVersion: v2` usage
    throw new BusinessError(
      "outputKey is required for bricks that return data (since apiVersion: v2)",
    );
  }

  return { output, context, blockOutput: output };
}

function throwBlockError(
  blockConfig: BrickConfig,
  state: IntermediateState,
  error: unknown,
  options: ReduceOptions,
) {
  const { index, context } = state;

  const { runId, logger, branches } = options;

  if (error instanceof HeadlessModeError) {
    // An "expected" error, let the caller deal with it
    throw error;
  }

  if (runId && blockConfig.instanceId) {
    traces.addExit({
      runId,
      branches,
      extensionId: logger.context.extensionId,
      blockId: blockConfig.id,
      blockInstanceId: blockConfig.instanceId,
      error: serializeError(error),
      skippedRun: false,
      isRenderer: false,
      isFinal: true,
    });
  }

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
    },
  );
}

async function getStepLogger(
  blockConfig: BrickConfig,
  pipelineLogger: Logger,
): Promise<Logger> {
  let resolvedConfig: ResolvedBrickConfig;

  try {
    resolvedConfig = await resolveBlockConfig(blockConfig);
  } catch {
    // NOP
  }

  let version = resolvedConfig?.block.version;

  if (resolvedConfig && !version) {
    // Built-in bricks don't have a version number. Use the browser extension version to identify bugs introduced
    // during browser extension releases
    version = validateSemVerString(browser.runtime.getManifest().version);
  }

  return pipelineLogger.childLogger({
    blockId: blockConfig.id,
    blockVersion: version,
    // Use the most customized name for the step
    label:
      blockConfig.label ??
      resolvedConfig?.block.name ??
      pipelineLogger.context.label,
  });
}

/** Execute all the bricks of an extension. */
export async function reduceExtensionPipeline(
  pipeline: BrickConfig | BrickPipeline,
  initialValues: InitialValues,
  partialOptions: Partial<ReduceOptions> = {},
): Promise<unknown> {
  const pipelineLogger = partialOptions.logger ?? new ConsoleLogger();

  // `await` promises to avoid race condition where the calls here delete debug entries from this call to reducePipeline
  await Promise.allSettled([
    traces.clear(pipelineLogger.context.extensionId),
    clearExtensionDebugLogs(pipelineLogger.context.extensionId),
  ]);

  return reducePipeline(pipeline, initialValues, {
    ...partialOptions,
    // Provide a runId if one is not provided. Safe to do because tracing will only be enabled if brick instance ids
    // also exist. Also see applyReduceDefaults.
    runId: partialOptions.runId ?? uuidv4(),
  });
}

/** Execute a pipeline of bricks and return the result. */
export async function reducePipeline(
  pipeline: BrickConfig | BrickPipeline,
  initialValues: InitialValues,
  partialOptions: Partial<ReduceOptions>,
): Promise<unknown> {
  const options = await applyReduceDefaults(partialOptions);

  const { input, root, serviceContext, optionsArgs } = initialValues;

  const { explicitDataFlow, logger: pipelineLogger, abortSignal } = options;

  let localVariableContext: BrickArgsContext = {
    // Put serviceContext first to prevent overriding the input/options
    ...serviceContext,
    "@input": input,
    "@options": optionsArgs ?? {},
  } as unknown as BrickArgsContext;

  // When using explicit data flow, the first brick (and other bricks) use `@input` in the context to get the inputs
  let output: unknown = explicitDataFlow ? {} : input;

  const pipelineArray = castArray(pipeline);

  for (const [index, blockConfig] of pipelineArray.entries()) {
    const state: IntermediateState = {
      root,
      index,
      isLastBlock: index === pipelineArray.length - 1,
      previousOutput: output,
      context: extendModVariableContext(localVariableContext, {
        blueprintId: pipelineLogger.context.blueprintId,
        options,
        // Mod variable is updated when each block is run
        update: true,
      }),
    };

    let nextValues: BlockOutput;

    const stepOptions = {
      ...options,
      // Could actually parallelize. But performance benefit won't be significant vs. readability impact
      // eslint-disable-next-line no-await-in-loop -- see comment above
      logger: await getStepLogger(blockConfig, pipelineLogger),
    };

    if (abortSignal?.aborted) {
      throwBlockError(
        blockConfig,
        state,
        new CancelError("Run automatically cancelled"),
        stepOptions,
      );
    }

    try {
      // eslint-disable-next-line no-await-in-loop -- can't parallelize because each step depends on previous step
      nextValues = await blockReducer(blockConfig, state, stepOptions);
    } catch (error) {
      throwBlockError(blockConfig, state, error, stepOptions);
    }

    output = nextValues.output;
    localVariableContext = nextValues.context;
  }

  return output;
}

/**
 * Reduce a pipeline of bricks declared in a !pipeline expression.
 *
 * Returns the output of the last brick, even if that brick has an output key.
 */
export async function reducePipelineExpression(
  pipeline: BrickPipeline,
  context: UnknownObject,
  root: SelectorRoot,
  options: ReduceOptions,
): Promise<unknown> {
  const { explicitDataFlow, logger: pipelineLogger } = options;

  if (!explicitDataFlow) {
    throw new Error(
      "reducePipelineExpression requires explicitDataFlow runtime setting",
    );
  }

  // The implicit output flowing from the bricks
  let legacyOutput: unknown = null;
  let lastBlockOutput: unknown = null;

  for (const [index, blockConfig] of pipeline.entries()) {
    const state: IntermediateState = {
      root,
      index,
      isLastBlock: index === pipeline.length - 1,
      previousOutput: legacyOutput,
      // Assume @input and @options are present
      context: extendModVariableContext(context as BrickArgsContext, {
        blueprintId: pipelineLogger.context.blueprintId,
        options,
        // Update mod variable when each block is run
        update: true,
      }),
    };

    let nextValues: BlockOutput;

    const stepOptions = {
      ...options,
      // Could actually parallelize. But performance benefit won't be significant vs. readability impact
      // eslint-disable-next-line no-await-in-loop -- see comment above
      logger: await getStepLogger(blockConfig, pipelineLogger),
    };

    try {
      // eslint-disable-next-line no-await-in-loop -- can't parallelize because each step depends on previous step
      nextValues = await blockReducer(blockConfig, state, stepOptions);
    } catch (error) {
      throwBlockError(blockConfig, state, error, stepOptions);
    }

    legacyOutput = nextValues.output;
    lastBlockOutput = nextValues.blockOutput;
    context = nextValues.context;
  }

  return lastBlockOutput;
}
