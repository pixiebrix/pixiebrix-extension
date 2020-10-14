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
} from "@/core";
import { validateInput } from "@/validators/generic";
import { OutputUnit } from "@cfworker/json-schema";
import pickBy from "lodash/pickBy";
import { ContextError } from "@/errors";

export type ReaderConfig =
  | string
  | { [key: string]: ReaderConfig }
  | ReaderConfig[];

export interface BlockConfig {
  id: string;
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
export function blockList(config: BlockConfig | BlockPipeline): IBlock[] {
  return castArray(config).map(({ id }) => {
    if (id == null) {
      throw new PipelineConfigurationError(
        "Pipeline stage is missing a block id",
        config
      );
    }
    return blockRegistry.lookup(id);
  });
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

type RenderedArgs = { [key: string]: unknown };

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
  stage: BlockConfig,
  args: RenderedArgs,
  {
    context,
    validate,
    logger,
  }: { context: RenderedArgs; validate: boolean; logger: Logger }
): Promise<unknown> {
  const block = blockRegistry.lookup(stage.id);

  const argContext = { ...context, ...args };
  const stageConfig = stage.config ?? {};

  // HACK: hack to avoid applying a list to the config for blocks that pass a list to the next block
  const blockArgs = isPlainObject(args)
    ? mapArgs(stageConfig, argContext, engineRenderer(stage.templateEngine))
    : stageConfig;

  if (validate) {
    const validationResult = validateInput(
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

  return (await block.run(blockArgs, { ctxt: args, logger })) ?? {};
}

/** Execute a pipeline of blocks and return the result. */
export async function reducePipeline(
  config: BlockConfig | BlockPipeline,
  renderedArgs: RenderedArgs,
  logger: Logger,
  options: ReduceOptions = { validate: true, serviceArgs: {} }
): Promise<unknown> {
  const extraContext: RenderedArgs = {
    "@input": renderedArgs,
    ...options.serviceArgs,
  };

  let currentArgs: RenderedArgs = renderedArgs;

  for (const [index, stage] of castArray(config).entries()) {
    const blockLogger = logger.childLogger({ blockId: stage.id });

    try {
      const output = await runStage(stage, currentArgs, {
        context: extraContext,
        validate: options.validate,
        logger: blockLogger,
      });
      if (stage.outputKey) {
        extraContext[`@${stage.outputKey}`] = output;
        logger.debug(`Storing ${stage.id} -> @${stage.outputKey}`, {
          value: output,
        });
      } else {
        // FIXME: need to rationalize how list outputs are passed along
        currentArgs = output as any;
      }
    } catch (ex) {
      throw new ContextError(
        ex,
        { blockId: stage.id },
        `An error occurred running pipeline stage #${index + 1}: ${stage.id}`
      );
    }
  }

  return currentArgs;
}

/** Instantiate a reader from a reader configuration. */
export function mergeReaders(readerConfig: ReaderConfig): IReader {
  if (typeof readerConfig === "string") {
    // FIXME: enforce the type of block returned by this lookup
    return blockRegistry.lookup(readerConfig) as any;
  } else if (Array.isArray(readerConfig)) {
    return new ArrayCompositeReader(readerConfig.map(mergeReaders));
  } else if (isPlainObject(readerConfig)) {
    return new CompositeReader(mapValues(readerConfig, mergeReaders));
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
