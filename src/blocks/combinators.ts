import castArray from "lodash/castArray";
import blockRegistry from "@/blocks/registry";
import isPlainObject from "lodash/isPlainObject";
import { engineRenderer, mapArgs } from "@/helpers";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import CompositeReader from "@/blocks/readers/CompositeReader";
import mapValues from "lodash/mapValues";
import {
  IBlock,
  IReader,
  TemplateEngine,
  Schema,
  ServiceDependency,
  ConfiguredService,
  ServiceLocator,
} from "@/core";
import { validateInput } from "@/validators/generic";
import { OutputUnit } from "@cfworker/json-schema";
import pickBy from "lodash/pickBy";

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

/** Execute a pipeline of blocks and return the result. */
export async function reducePipeline(
  config: BlockConfig | BlockPipeline,
  renderedArgs: RenderedArgs,
  options: ReduceOptions = { validate: true, serviceArgs: {} }
): Promise<unknown> {
  const extraContext: RenderedArgs = {
    "@input": renderedArgs,
    ...options.serviceArgs,
  };

  let ctxt: RenderedArgs = renderedArgs;

  for (const stage of castArray(config)) {
    try {
      const block = blockRegistry.lookup(stage.id);

      const argContext = { ...extraContext, ...ctxt };

      const stageConfig = stage.config ?? {};

      // HACK: hack to avoid applying a list to the config for blocks that pass a list to the next block
      const blockArgs = isPlainObject(ctxt)
        ? mapArgs(stageConfig, argContext, engineRenderer(stage.templateEngine))
        : stageConfig;

      if (options.validate) {
        const validationResult = validateInput(
          castSchema(block.inputSchema),
          excludeUndefined(blockArgs)
        );
        if (!validationResult.valid) {
          console.warn(`Invalid inputs for block ${stage.id}`, {
            schema: block.inputSchema,
            blockArgs,
            errors: validationResult.errors,
            extraContext,
          });

          // throw new InputValidationError(
          //   `Invalid inputs for block ${stage.id}`,
          //   block.inputSchema,
          //   blockArgs,
          //   validationResult.errors
          // );
        }
      }

      const output = (await block.run(blockArgs, { ctxt })) ?? {};

      if (stage.outputKey) {
        // if output key is defined, store to a variable instead of passing to the next stage
        extraContext[`@${stage.outputKey}`] = output;
        console.debug(`Storing ${stage.id} -> @${stage.outputKey}`, {
          value: output,
        });
      } else if (isPlainObject(output)) {
        ctxt = output as RenderedArgs;
      } else {
        // FIXME: need to rationalize how list outputs are passed along
        ctxt = output as any;
      }
    } catch (ex) {
      console.exception(ex);
      throw ex;
    }
  }

  return ctxt;
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
    __service: ConfiguredService;
    [prop: string]: string | ConfiguredService | null;
  };
};

/** Build the service context by locating the dependencies */
export async function makeServiceContext(
  dependencies: ServiceDependency[],
  locator: ServiceLocator
): Promise<ServiceContext> {
  const ctxt: ServiceContext = {};
  for (const dependency of dependencies) {
    const configuredService = await locator(dependency.id, dependency.config);
    ctxt[`@${dependency.outputKey}`] = {
      // our JSON validator gets mad at undefined values
      ...pickBy(configuredService.config, (x) => x !== undefined),
      __service: configuredService,
    };
  }
  return ctxt;
}
