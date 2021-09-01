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
import { mapArgs } from "@/helpers";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import CompositeReader from "@/blocks/readers/CompositeReader";
import { locate } from "@/background/locator";
import {
  BlockArg,
  IBlock,
  IReader,
  isEffectBlock,
  isReader,
  isRendererBlock,
  Logger,
  MessageContext,
  OutputKey,
  ReaderRoot,
  RenderedArgs,
  SanitizedServiceConfiguration,
  Schema,
  ServiceDependency,
  UserOptions,
} from "@/core";
import { validateInput, validateOutput } from "@/validators/generic";
import { castArray, isEmpty, isPlainObject, mapValues, pickBy } from "lodash";
import { BusinessError, ContextError } from "@/errors";
import {
  executeInAll,
  executeInOpener,
  executeInTarget,
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
} from "@/blocks/errors";
import { engineRenderer } from "@/utils/renderers";
import { BlockConfig, BlockPipeline, ReaderConfig } from "./types";

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

interface ReduceOptions {
  validate?: boolean;
  logValues?: boolean;
  headless?: boolean;
  optionsArgs?: UserOptions;
  serviceArgs?: RenderedArgs;
}

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

  // If logValues not provided explicitly, default to the global setting
  if (logValues === undefined) {
    logValues = (await getLoggingConfig()).logValues ?? false;
  }

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
      ? mapArgs(
          stageConfig,
          argContext,
          await engineRenderer(stage.templateEngine)
        )
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

  if (isRendererBlock(block) && headless) {
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

function arraySchema(base: Schema): Schema {
  return {
    type: "array",
    items: base,
  };
}

/** Execute a pipeline of blocks and return the result. */
export async function reducePipeline(
  pipeline: BlockConfig | BlockPipeline,
  renderedArgs: RenderedArgs,
  logger: Logger,
  root: HTMLElement | Document = null,
  {
    validate = true,
    // Don't default `logValues`, will set async below using `getLoggingConfig` if not provided
    logValues,
    headless = false,
    optionsArgs = {},
    serviceArgs = {},
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

  let currentArgs: RenderedArgs = renderedArgs;

  for (const [index, stage] of castArray(pipeline).entries()) {
    const stageContext: MessageContext = {
      blockId: stage.id,
      label: stage.label,
    };
    const stageLogger = logger.childLogger(stageContext);

    try {
      const $stageRoot = stage.root
        ? // eslint-disable-next-line unicorn/no-array-callback-reference -- false positive for JQuery
          $(root ?? document).find(stage.root)
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
        const renderer = await engineRenderer(stage.templateEngine);

        const { if: condition } = mapArgs(
          { if: stage.if },
          { ...extraContext, ...currentArgs },
          renderer
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
        validate,
        headless,
        logger: stageLogger,
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

      if (isEffectBlock(block)) {
        if (stage.outputKey) {
          logger.warn(`Ignoring output key for effect ${block.id}`);
        }

        if (output != null) {
          console.warn(`Effect ${block.id} produced an output`, { output });
          logger.warn(`Ignoring output produced by effect ${block.id}`);
        }
      } else if (stage.outputKey) {
        extraContext[`@${stage.outputKey}`] = output;
      } else {
        currentArgs = output as any;
      }
      // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch
    } catch (error) {
      if (error instanceof HeadlessModeError) {
        // An "expected" error, let the caller deal with it
        throw error;
      }

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
