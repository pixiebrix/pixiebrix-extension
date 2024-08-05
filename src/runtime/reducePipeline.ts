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

import { type Logger } from "@/types/loggerTypes";
import { castArray, isPlainObject, omit, once } from "lodash";
import { requestRun, sendDeploymentAlert } from "@/background/messenger/api";
import { hideNotification, showNotification } from "@/utils/notify";
import { serializeError } from "serialize-error";
import { HeadlessModeError } from "@/bricks/errors";
import { engineRenderer } from "@/runtime/renderers";
import { type TraceExitData, type TraceRecordMeta } from "@/telemetry/trace";
import { type JsonObject, type SetRequired } from "type-fest";
import { uuidv4 } from "@/types/helpers";
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
  selectBrickRootElement,
  shouldRunBrick,
  throwIfInvalidInput,
} from "@/runtime/runtimeUtils";
import ConsoleLogger from "@/utils/ConsoleLogger";
import {
  BrickTypes,
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
import { getLoggingConfig } from "@/telemetry/logging";
import { type UUID } from "@/types/stringTypes";
import {
  type BrickArgs,
  type BrickArgsContext,
  type SelectorRoot,
  type RenderedArgs,
  type IntegrationsContext,
  type OptionsArgs,
  type PipelineExpression,
  type RunMetadata,
} from "@/types/runtimeTypes";
import { isPipelineClosureExpression } from "@/utils/expressionUtils";
import extendModVariableContext from "@/runtime/extendModVariableContext";
import { isObject } from "@/utils/objectUtils";
import type {
  RegistryId,
  RegistryProtocol,
  SemVerString,
} from "@/types/registryTypes";
import type { Brick } from "@/types/brickTypes";
import getType from "@/runtime/getType";
import { getPlatform } from "@/platform/platformContext";
import { type Nullishable, assertNotNullish } from "@/utils/nullishUtils";
import { nowTimestamp } from "@/utils/timeUtils";
import { flagOn } from "@/auth/featureFlagStorage";

// Introduce a layer of indirection to avoid cyclical dependency between runtime and registry
// eslint-disable-next-line local-rules/persistBackgroundData -- Static
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
 * CommonOptions for running pipelines and bricks
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

/**
 * @see reduceOptionsFactory
 */
export type ReduceOptions = CommonOptions & RunMetadata;

export type InitialValues = {
  /**
   * The inputs to the BrickPipeline, e.g., from the foundation's readers. Are placed under the `@input` key
   * @see StarterBrick.defaultReader
   */
  input: UnknownObject | undefined;
  /**
   * Option values provided by the user during activation of an extension
   * @see ModComponentBase.optionsArgs
   */
  optionsArgs?: OptionsArgs;
  /**
   * Service credentials provided by the user during activation of an extension
   * @see ModComponentBase.services
   */
  serviceContext?: IntegrationsContext;
  /**
   * The document root for root-aware bricks, including readers
   * @see Brick.isRootAware
   */
  root: Nullishable<SelectorRoot>;
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
  root: Nullishable<SelectorRoot>;
  /**
   * The brick's position in the BrickPipeline. Used to improve logging and error messages
   * @see BrickPipeline
   */
  index: number;
  /**
   * `true` if the brick is the last brick in the pipeline, for logging and validation
   * @see BrickPipeline
   */
  isLastBrick: boolean;
};

/**
 * All the data that determine the execution behavior of a brick
 * @see Brick.run
 */
type BrickProps<TArgs extends RenderedArgs | BrickArgs = RenderedArgs> = {
  /**
   * The rendered args for the brick, which may or may not have been already validated against the inputSchema depending
   * on the static type.
   */
  args?: TArgs;

  /**
   * The available context (The context used to render the args.)
   */
  context: BrickArgsContext;

  /**
   * The previous output
   * @deprecated ignored since runtime v2
   */
  previousOutput: unknown;

  /**
   * The root for root-aware bricks
   * @see Brick.isRootAware
   */
  root?: SelectorRoot;
};

type BrickOutput = {
  /**
   * The implicit output to pass to the next brick in the pipeline.
   *
   * Since runtime apiVersion: 2, output will be an empty object until the last brick in the pipeline.
   */
  output: unknown;

  /**
   * The value returned by the brick.
   * @since 1.7.0
   */
  brickReturnValue: unknown;

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
  brickInstanceId: Nullishable<UUID>;
}

type RunBrickOptions = CommonOptions & {
  /**
   * Additional context to record with the trace entry/exit records.
   */
  trace: TraceMetadata;
};

/**
 * Get the lexical environment for running a pipeline. Currently, we're just tracking on the pipeline arg itself.
 * https://en.wikipedia.org/wiki/Closure_(computer_programming)
 */
function getPipelineLexicalEnvironment({
  pipeline,
  ctxt,
  extraContext,
}: {
  pipeline: PipelineExpression;
  ctxt: UnknownObject;
  extraContext?: UnknownObject;
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

async function resolveBrickConfig(
  config: BrickConfig,
): Promise<ResolvedBrickConfig> {
  const brick = await brickRegistry.lookup(config.id);
  return {
    config,
    brick,
    type: await getType(brick),
  };
}

/**
 * Execute/run the resolved brick in the target (self, etc.) with the validated args.
 */
async function executeBrickWithValidatedProps(
  { config, brick }: ResolvedBrickConfig,
  { args, context, root, previousOutput }: BrickProps<BrickArgs>,
  options: RunBrickOptions,
): Promise<unknown> {
  const commonOptions = {
    // This condition of what to pass to the brick is wacky, but seemingly necessary to replicate behavior in v1 where
    // if the previous brick output an array, the array would be passed as the context to the next brick.
    // See the corresponding hack/condition in renderBlockArg
    ctxt:
      options.explicitArg || isPlainObject(previousOutput)
        ? context
        : (previousOutput as UnknownObject),
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
      const { runId, modComponentRef, branches } = options.trace;

      return brick.run(args, {
        platform: getPlatform(),
        ...commonOptions,
        ...options,
        meta: {
          modComponentRef,
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
              modComponentRef,
              branches: [...branches, branch],
            },
          );
        },
        /**
         * Renderers need to be run with try-catch, catch the HeadlessModeError, and
         * use that to send the panel payload to the sidebar (or other target)
         * @see runRendererBrick
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

          const { runId, modComponentRef, branches } = options.trace;
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
                modComponentRef,
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
                brickId: error.brickId,
                args: error.args,
                ctxt: error.ctxt,
                modComponentRef,
                runId,
              };
            } else {
              payload = {
                key: runId,
                error: serializeError(error),
                modComponentRef,
                runId,
              };
            }
          }

          return payload;
        },
      });
    }

    default: {
      throw new BusinessError(`Unexpected window ${config.window}`);
    }
  }
}

async function renderBrickArg(
  resolvedConfig: ResolvedBrickConfig,
  state: IntermediateState,
  options: RunBrickOptions,
): Promise<RenderedArgs> {
  const { config, type } = resolvedConfig;

  const globalLoggingConfig = await getLoggingConfig();

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
  const configTemplate = config.config ?? {};

  if (type === BrickTypes.READER) {
    // `reducePipeline` is responsible for passing the correct root on the BrickConfig
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
  const ctxt =
    explicitDataFlow || !isObject(state.previousOutput)
      ? state.context
      : { ...state.context, ...state.previousOutput };

  const implicitRender = explicitRender
    ? null
    : engineRenderer(
        config.templateEngine ?? DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
        { autoescape },
      );

  const brickArgs = (await mapArgs(configTemplate, ctxt, {
    implicitRender,
    autoescape,
  })) as RenderedArgs;

  if (logValues) {
    logger.debug(
      `Input for brick ${config.id} (window=${config.window ?? "self"})`,
      {
        id: config.id,
        template: configTemplate,
        templateContext: state.context,
        renderedArgs: brickArgs,
      },
    );
  }

  return brickArgs;
}

function selectTraceRecordMeta(
  resolvedConfig: ResolvedBrickConfig,
  options: RunBrickOptions,
): TraceRecordMeta {
  return {
    // TraceRecordMeta uses modComponentId instead of modComponentRef
    ...omit(options.trace, "modComponentRef"),
    brickId: resolvedConfig.config.id,
    modComponentId: options.trace.modComponentRef.modComponentId,
  };
}

/**
 * Return true if tracing is enabled based on the given tracing options and the platform
 */
function selectTraceEnabled({
  runId,
  brickInstanceId,
}: Pick<TraceMetadata, "runId" | "brickInstanceId">): boolean {
  return (
    Boolean(runId) &&
    Boolean(brickInstanceId) &&
    getPlatform().capabilities.includes("debugger")
  );
}

async function runBrick(
  resolvedConfig: ResolvedBrickConfig,
  props: BrickProps,
  options: RunBrickOptions,
): Promise<unknown> {
  const { validateInput, logger, headless, trace } = options;

  const { config: brickConfig, brick, type } = resolvedConfig;

  let isAllowed;

  try {
    isAllowed = brick.featureFlag == null || (await flagOn(brick.featureFlag));
  } catch {
    // Don't ban on network/storage errors checking feature flags
    isAllowed = true;
  }

  if (!isAllowed) {
    // Throw as an application Error, so we get telemetry of potential feature flag misconfiguration
    throw new Error(`Brick not available. Feature flag: ${brick.featureFlag}`);
  }

  if (validateInput) {
    await throwIfInvalidInput(brick, props.args);
  }

  let notification: string | undefined;

  if (brickConfig.notifyProgress) {
    notification = showNotification({
      message: brickConfig.label ?? brick.name,
      type: "loading",
    });
  }

  if (type === BrickTypes.RENDERER && headless) {
    if (selectTraceEnabled(trace)) {
      getPlatform().debugger.traces.exit({
        ...trace,
        modComponentId: trace.modComponentRef.modComponentId,
        brickId: brick.id,
        isFinal: true,
        isRenderer: true,
        error: null,
        output: null,
        skippedRun: false,
      });
    }

    throw new HeadlessModeError(
      brick.id,
      // Call to throwIfInvalidInput above ensures args are valid for the brick
      unsafeAssumeValidArg(props.args),
      props.context,
      logger.context,
    );
  }

  try {
    // Inputs validated in throwIfInvalidInput
    const validatedProps = props as unknown as BrickProps<BrickArgs>;
    return await executeBrickWithValidatedProps(
      resolvedConfig,
      validatedProps,
      options,
    );
  } finally {
    if (brickConfig.notifyProgress && notification) {
      hideNotification(notification);
    }
  }
}

async function applyReduceDefaults({
  logValues,
  runId,
  modComponentRef,
  logger: providedLogger,
  ...overrides
}: SetRequired<
  Partial<ReduceOptions>,
  "modComponentRef"
>): Promise<ReduceOptions> {
  const globalLoggingConfig = await getLoggingConfig();
  const logger = providedLogger ?? new ConsoleLogger();

  return {
    modComponentRef,
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

export async function brickReducer(
  brickConfig: BrickConfig,
  state: IntermediateState,
  options: ReduceOptions,
): Promise<BrickOutput> {
  const { index, isLastBrick, previousOutput, context, root } = state;
  const {
    runId,
    modComponentRef,
    explicitDataFlow,
    logValues,
    logger,
    branches,
  } = options;

  // Match the override behavior in v1, where the output from previous brick would override anything in the context
  const contextWithPreviousOutput =
    explicitDataFlow || !isObject(previousOutput)
      ? context
      : { ...context, ...previousOutput };

  const resolvedConfig = await resolveBrickConfig(brickConfig);

  const optionsWithTraceRef: RunBrickOptions = {
    ...options,
    trace: {
      runId,
      modComponentRef,
      brickInstanceId: brickConfig.instanceId,
      branches,
    },
  };

  // Adjust the root according to the `root` and `rootMode` props on the blockConfig
  const brickRoot = await selectBrickRootElement(
    brickConfig,
    // IntermediateState.root is nullishable. Fallback to the document
    root ?? document,
    context,
    options,
  );

  let renderedArgs: RenderedArgs | undefined;
  let renderError: unknown;

  // Only renders the args if we need them
  const lazyRenderArgs = once(async () => {
    try {
      renderedArgs = await renderBrickArg(
        resolvedConfig,
        { ...state, root: brickRoot },
        optionsWithTraceRef,
      );
    } catch (error) {
      renderError = error;
    }
  });

  // Pass optionsWithTraceRef because it includes the trace property
  const traceMeta = selectTraceRecordMeta(resolvedConfig, optionsWithTraceRef);
  const traceEnabled = selectTraceEnabled(traceMeta);

  if (traceEnabled) {
    await lazyRenderArgs();

    // Always add the trace entry, even if the brick didn't run
    getPlatform().debugger.traces.enter({
      ...traceMeta,
      timestamp: nowTimestamp(),
      templateContext: context as JsonObject,
      renderError: renderError ? serializeError(renderError) : null,
      // `renderedArgs` will be null if there's an error rendering args
      renderedArgs,
      brickConfig,
    });
  }

  const preconfiguredTraceExit: TraceExitData = {
    ...traceMeta,
    outputKey: brickConfig.outputKey,
    output: null,
    skippedRun: false,
    isRenderer: false,
    isFinal: true,
  };

  if (
    !(await shouldRunBrick(brickConfig, contextWithPreviousOutput, options))
  ) {
    logger.debug(`Skipping brick ${brickConfig.id} because condition not met`);

    if (traceEnabled) {
      getPlatform().debugger.traces.exit({
        ...preconfiguredTraceExit,
        output: null,
        skippedRun: true,
      });
    }

    return { output: previousOutput, context, brickReturnValue: undefined };
  }

  // Render args for the run
  await lazyRenderArgs();

  // Above we had wrapped the call to renderBrickArg in a try-catch to always have an entry trace entry
  if (renderError) {
    throw renderError;
  }

  const props: BrickProps = {
    args: renderedArgs,
    root: brickRoot,
    previousOutput,
    context: contextWithPreviousOutput,
  };

  const brickReturnValue = await runBrick(
    resolvedConfig,
    props,
    optionsWithTraceRef,
  );

  if (logValues) {
    console.info(`Output for brick #${index + 1}: ${brickConfig.id}`, {
      brickReturnValue,
      outputKey: brickConfig.outputKey ? `@${brickConfig.outputKey}` : null,
    });

    logger.debug(`Output for brick #${index + 1}: ${brickConfig.id}`, {
      brickReturnValue,
      outputKey: brickConfig.outputKey ? `@${brickConfig.outputKey}` : null,
    });
  }

  if (traceEnabled) {
    getPlatform().debugger.traces.exit({
      ...preconfiguredTraceExit,
      output: brickReturnValue as JsonObject,
      skippedRun: false,
    });
  }

  await logIfInvalidOutput(resolvedConfig.brick, brickReturnValue, logger, {
    window: brickConfig.window,
  });

  if (resolvedConfig.type === BrickTypes.EFFECT) {
    if (brickConfig.outputKey) {
      logger.warn(`Ignoring output key for effect: ${brickConfig.id}`);
    }

    // If run against multiple targets, the output at this point will be an array
    if (
      brickReturnValue != null &&
      !hasMultipleTargets(resolvedConfig.config.window)
    ) {
      console.warn(`Effect ${brickConfig.id} produced a return value`, {
        output: brickReturnValue,
      });
      logger.warn(`Ignoring return value produced by effect ${brickConfig.id}`);
    }

    return { output: previousOutput, context, brickReturnValue: undefined };
  }

  // XXX: note this check comes before the isLastBrick check. We're keeping this order for backward compatability with
  // apiVersion: 1. The downside is its error-prone when writing user-defined bricks, because the brick output won't
  // be what you expect if you accidentally include on an outputKey (e.g., as when copying configurations from a mod)
  if (brickConfig.outputKey) {
    return {
      output: previousOutput,
      context: {
        ...context,
        // Keys overwrite any previous keys with the same name
        [`@${brickConfig.outputKey}`]: brickReturnValue,
      },
      brickReturnValue,
    };
  }

  // Always return the value of the last brick in the pipeline
  if (isLastBrick) {
    return { output: brickReturnValue, context, brickReturnValue };
  }

  // In apiVersion: 2+, treat bricks without outputKeys like effect bricks.
  // Prior to 2.0.7, the runtime would throw an error here if explicitDataFlow flag was set, but the brick did not have
  // an output key. In 2.0.7 we made output keys optional in the runtime so that we can let users avoid introducing
  // unnecessary output variables in the Page Editor UI
  if (explicitDataFlow) {
    return { output: previousOutput, context, brickReturnValue: undefined };
  }

  // In apiVersion: 1, the brick's return value would be implicitly passed to the next brick
  return { output: brickReturnValue, context, brickReturnValue };
}

function throwBrickError(
  brickConfig: BrickConfig,
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

  if (selectTraceEnabled({ runId, brickInstanceId: brickConfig.instanceId })) {
    getPlatform().debugger.traces.exit({
      runId,
      branches,
      modComponentId: options.modComponentRef.modComponentId,
      brickId: brickConfig.id,
      brickInstanceId: brickConfig.instanceId,
      error: serializeError(error),
      skippedRun: false,
      isRenderer: false,
      isFinal: true,
    });
  }

  if (brickConfig.onError?.alert) {
    // An affordance to send emails to allow for manual process recovery if a step fails (e.g., an API call to a
    // transaction queue fails)
    if (logger.context.deploymentId) {
      sendDeploymentAlert({
        deploymentId: logger.context.deploymentId,
        data: {
          id: brickConfig.id,
          context,
          error: serializeError(error),
        },
      });
    } else {
      logger.warn("Can only send alert from deployment context");
    }
  }

  throw new ContextError(
    `Error running pipeline brick at position #${index}: ${brickConfig.id}`,
    {
      cause: error,
      context: logger.context,
    },
  );
}

async function getBrickLogger(
  brickConfig: BrickConfig,
  pipelineLogger: Logger,
): Promise<Logger> {
  let resolvedConfig: ResolvedBrickConfig | null = null;
  let version: SemVerString | undefined;

  try {
    resolvedConfig = await resolveBrickConfig(brickConfig);
    version = resolvedConfig.brick.version;

    // Built-in bricks don't have a version number. Use the browser extension version to identify bugs introduced
    // during browser extension releases
    version ??= getPlatform().version;
  } catch {
    // NOP
  }

  return pipelineLogger.childLogger({
    brickId: brickConfig.id,
    brickVersion: version,
    // Use the most customized name for the step
    label:
      brickConfig.label ??
      resolvedConfig?.brick.name ??
      pipelineLogger.context.label,
  });
}

/** Execute primary pipeline of a mod component attached to a starter brick. */
export async function reduceModComponentPipeline(
  pipeline: BrickConfig | BrickPipeline,
  initialValues: InitialValues,
  partialOptions: SetRequired<Partial<ReduceOptions>, "modComponentRef">,
): Promise<unknown> {
  const platform = getPlatform();

  if (platform.capabilities.includes("debugger")) {
    try {
      // `await` promise to avoid race condition where the calls here delete entries from this call to reducePipeline
      await platform.debugger.clear(
        partialOptions.modComponentRef.modComponentId,
      );
    } catch {
      // NOP
    }
  }

  return reducePipeline(pipeline, initialValues, {
    ...partialOptions,
    // Provide a runId if one is not provided. Safe to do because tracing will only be enabled if brick instance ids
    // also exist. Also see applyReduceDefaults.
    runId: partialOptions.runId ?? uuidv4(),
  });
}

/**
 * Execute a pipeline of bricks and return the result. For starter bricks, use reduceModComponentPipeline.
 * @see reduceModComponentPipeline
 */
export async function reducePipeline(
  pipeline: BrickConfig | BrickPipeline,
  initialValues: InitialValues,
  partialOptions: SetRequired<Partial<ReduceOptions>, "modComponentRef">,
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

  for (const [index, brickConfig] of pipelineArray.entries()) {
    const state: IntermediateState = {
      root,
      index,
      isLastBrick: index === pipelineArray.length - 1,
      previousOutput: output,
      context: extendModVariableContext(localVariableContext, {
        modComponentRef: partialOptions.modComponentRef,
        options,
        // Mod variable is updated when each block is run
        update: true,
      }),
    };

    let nextValues: BrickOutput | null = null;

    const stepOptions = {
      ...options,
      // Could actually parallelize. But performance benefit won't be significant vs. readability impact
      // eslint-disable-next-line no-await-in-loop -- see comment above
      logger: await getBrickLogger(brickConfig, pipelineLogger),
    };

    if (abortSignal?.aborted) {
      throwBrickError(
        brickConfig,
        state,
        new CancelError("Run automatically cancelled"),
        stepOptions,
      );
    }

    try {
      // eslint-disable-next-line no-await-in-loop -- can't parallelize because each step depends on previous step
      nextValues = await brickReducer(brickConfig, state, stepOptions);
    } catch (error) {
      throwBrickError(brickConfig, state, error, stepOptions);
    }

    // Must be set because throwBrickError will throw if it's not
    assertNotNullish(nextValues, "nextValues must be set after running brick");

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
async function reducePipelineExpression(
  pipeline: BrickPipeline,
  context: UnknownObject,
  root: SelectorRoot | undefined,
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
  let lastBrickReturnValue: unknown = null;

  for (const [index, brickConfig] of pipeline.entries()) {
    const state: IntermediateState = {
      root,
      index,
      isLastBrick: index === pipeline.length - 1,
      previousOutput: legacyOutput,
      // Assume @input and @options are present
      context: extendModVariableContext(context as BrickArgsContext, {
        modComponentRef: options.modComponentRef,
        options,
        // Update mod variable when each block is run
        update: true,
      }),
    };

    let nextValues: BrickOutput | null = null;

    const stepOptions = {
      ...options,
      // Could actually parallelize. But performance benefit won't be significant vs. readability impact
      // eslint-disable-next-line no-await-in-loop -- see comment above
      logger: await getBrickLogger(brickConfig, pipelineLogger),
    };

    try {
      // eslint-disable-next-line no-await-in-loop -- can't parallelize because each step depends on previous step
      nextValues = await brickReducer(brickConfig, state, stepOptions);
    } catch (error) {
      throwBrickError(brickConfig, state, error, stepOptions);
    }

    // Must be set because throwBrickError will throw if it's not
    assertNotNullish(nextValues, "nextValues must be set after running brick");

    legacyOutput = nextValues.output;
    lastBrickReturnValue = nextValues.brickReturnValue;
    context = nextValues.context;
  }

  // Unlike reducePipeline, always returns the last brick's return value
  return lastBrickReturnValue;
}
