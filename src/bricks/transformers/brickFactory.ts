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

import { type Brick, BrickABC } from "@/types/brickTypes";
import { readerFactory } from "@/bricks/readers/factory";
import { castArray, cloneDeep, compact, flatten, pickBy, uniq } from "lodash";
import { type InitialValues, reducePipeline } from "@/runtime/reducePipeline";
import { validatePackageDefinition } from "@/validators/schemaValidator";
import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import getType from "@/runtime/getType";
import { type BrickType, validateOutputKey } from "@/runtime/runtimeTypes";
import { InvalidDefinitionError } from "@/errors/businessErrors";
import {
  type ApiVersion,
  type BrickArgs,
  type BrickOptions,
  type OutputKey,
  validateBrickArgsContext,
} from "@/types/runtimeTypes";
import {
  type Schema,
  type SchemaDefinition,
  type UiSchema,
} from "@/types/schemaTypes";
import {
  DefinitionKinds,
  type Metadata,
  type RegistryId,
  type SemVerString,
} from "@/types/registryTypes";
import {
  isPipelineExpression,
  type PipelineClosureExpression,
} from "@/utils/expressionUtils";
import { isContentScript } from "webext-detect-page";
import { getConnectedTarget } from "@/sidebar/connectedTarget";
import { uuidv4 } from "@/types/helpers";
import { isSpecificError } from "@/errors/errorHelpers";
import { HeadlessModeError } from "@/bricks/errors";
import {
  inputProperties,
  unionSchemaDefinitionTypes,
} from "@/utils/schemaUtils";
import type BaseRegistry from "@/registry/memoryRegistry";
import type { PlatformCapability } from "@/platform/capabilities";
import { runHeadlessPipeline } from "@/contentScript/messenger/api";

// Interface to avoid circular dependency with the implementation
type BrickRegistryProtocol = BaseRegistry<RegistryId, Brick>;

export type BrickDefinition = {
  /**
   * The runtime version to use when running the Brick.
   */
  apiVersion?: ApiVersion;

  /**
   * User-defined brick kind.
   */
  kind: typeof DefinitionKinds.BRICK;

  /**
   * Registry package metadata.
   */
  metadata: Metadata;

  /**
   * The wrapped bricks.
   */
  pipeline: BrickConfig | BrickPipeline;

  /**
   * JSON Schema for brick inputs.
   */
  inputSchema: Schema;

  /**
   * An optional RJSF uiSchema for inputs.
   *
   * Currently only supports the ui:order property.
   *
   * @since 1.7.16
   */
  uiSchema?: UiSchema;

  /**
   * An optional JSON Output Schema for the brick.
   */
  outputSchema?: Schema;

  /**
   * The default output key to use for the brick
   * @since 1.7.34
   */
  defaultOutputKey?: OutputKey | null;
};

/**
 * Throw an error if the brick definition is invalid with respect to the brick meta-schema.
 */
function validateBrickDefinition(
  component: unknown,
): asserts component is BrickDefinition {
  const result = validatePackageDefinition("component", component);

  if (!result.valid) {
    console.warn("Invalid user-defined brick configuration", {
      component,
      result,
    });
    throw new InvalidDefinitionError(
      "Invalid user-defined brick configuration",
      result.errors,
    );
  }
}

/**
 * A non-native (i.e., non-JS) Brick. Typically defined in YAML/JSON.
 */
class UserDefinedBrick extends BrickABC {
  readonly apiVersion: ApiVersion;

  readonly inputSchema: Schema;

  readonly version?: SemVerString;

  constructor(
    private readonly registry: BrickRegistryProtocol,
    public readonly component: BrickDefinition,
  ) {
    const { id, name, description, version } = component.metadata;
    super(id, name, description);
    // Fall back to v1 for backward compatability
    this.apiVersion = component.apiVersion ?? "v1";
    this.component = component;
    this.inputSchema = this.component.inputSchema;
    this.uiSchema = this.component.uiSchema;
    this.outputSchema = this.component.outputSchema;
    this.version = version;
    this.defaultOutputKey = UserDefinedBrick.parseDefaultOutputKey(component);
  }

  private static parseDefaultOutputKey(
    definition: BrickDefinition,
  ): OutputKey | null {
    if (!definition.defaultOutputKey) {
      return null;
    }

    try {
      // Already validated in the JSON Schema, but be defensive
      return validateOutputKey(definition.defaultOutputKey);
    } catch {
      return null;
    }
  }

  override async isPure(): Promise<boolean> {
    const pipeline = castArray(this.component.pipeline);

    const purity = await Promise.all(
      pipeline.map(async (blockConfig) => {
        const resolvedBlock = await this.registry.lookup(blockConfig.id);
        return resolvedBlock.isPure();
      }),
    );

    // All must be pure for the brick to be pure.
    return purity.every(Boolean);
  }

  override async isRootAware(): Promise<boolean> {
    const pipeline = castArray(this.component.pipeline);

    const awareness = await Promise.all(
      pipeline.map(async (blockConfig) => {
        const resolvedBlock = await this.registry.lookup(blockConfig.id);
        return resolvedBlock.isRootAware();
      }),
    );

    return awareness.some(Boolean);
  }

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    const pipeline = castArray(this.component.pipeline);

    const capabilities = await Promise.all(
      pipeline.flatMap(async (blockConfig) => {
        const resolvedBlock = await this.registry.lookup(blockConfig.id);
        return resolvedBlock.getRequiredCapabilities(blockConfig);
      }),
    );

    return uniq(flatten(capabilities));
  }

  override async isPageStateAware(): Promise<boolean> {
    const pipeline = castArray(this.component.pipeline);

    const awareness = await Promise.all(
      pipeline.map(async (blockConfig) => {
        const resolvedBlock = await this.registry.lookup(blockConfig.id);
        return resolvedBlock?.isPageStateAware();
      }),
    );

    return awareness.some(Boolean);
  }

  override async getModVariableSchema(
    _config: BrickConfig,
  ): Promise<Schema | undefined> {
    const pipeline = castArray(this.component.pipeline);

    const schemas = await Promise.all(
      pipeline.map(async (blockConfig) => {
        const block = await this.registry.lookup(blockConfig.id);
        return block.getModVariableSchema?.(blockConfig);
      }),
    );

    // Start with an empty object
    let result: SchemaDefinition = {
      type: "object",
      properties: {},
      additionalProperties: false,
    };

    for (const schema of compact(schemas)) {
      result = unionSchemaDefinitionTypes(result, schema);
    }

    // Can't happen in practice because the initial value is an object
    if (!result) {
      throw new Error("Internal error: got false for schema definition");
    }

    return typeof result === "object"
      ? result
      : { type: "object", additionalProperties: true };
  }

  async inferType(): Promise<BrickType | null> {
    const pipeline = castArray(this.component.pipeline);
    const last = pipeline.at(-1);

    if (!last || this.id === last.id) {
      // Guard against infinite recursion
      return null;
    }

    try {
      const lastBrick = await this.registry.lookup(last.id);
      return await getType(lastBrick);
    } catch {
      return null;
    }
  }

  /**
   * Keep track of the lexical environment for any pipelines passed to the brick.
   *
   * Currently we're keeping track on the pipeline expression. That's inefficient for tracing, but is the simplest to
   * implement. In the future, we may want to keep track of a map of lexical environments in the runtime.
   *
   * We also might in the future want to keep track in mapArgs:renderExplicit. However, that would be inefficient
   * because UserDefinedBrick is currently the only block that switches the context. (The control flow bricks, e.g.,
   * try-except extend the context, but don't swap out the "@input", "@options", etc.).
   *
   * TODO: also track for deferred expressions. (Currently, deferred expressions only appear in the Document Builder.).
   *  Deferred expressions don't have a JSON Schema $ref type.
   *
   * Read more: https://en.wikipedia.org/wiki/Closure_(computer_programming)
   */
  private capturePipelineClosures(
    args: BrickArgs,
    options: BrickOptions,
  ): BrickArgs {
    const pipelinePropertyNames = Object.keys(
      pickBy(
        inputProperties(this.inputSchema),
        (value) =>
          typeof value === "object" &&
          value.$ref === "https://app.pixiebrix.com/schemas/pipeline#",
      ),
    );

    if (typeof args === "object" && pipelinePropertyNames.length > 0) {
      const fresh = cloneDeep(args);

      for (const name of pipelinePropertyNames) {
        // eslint-disable-next-line security/detect-object-injection -- from inputSchema
        if (Object.hasOwn(fresh, name) && isPipelineExpression(fresh[name])) {
          // eslint-disable-next-line security/detect-object-injection -- from inputSchema
          (fresh[name] as PipelineClosureExpression).__env__ = options.ctxt;
        }
      }

      return fresh;
    }

    return args;
  }

  async run(args: BrickArgs, options: BrickOptions): Promise<unknown> {
    const argsWithClosures = this.capturePipelineClosures(args, options);

    options.logger.debug("Running component pipeline", {
      args: argsWithClosures,
    });

    // Can't use options.runPipeline because we want to:
    // 1) replace the context, not extend it
    // 2) run the pipeline with a potentially different API version

    // UserDefinedBricks only have inputs, they can't pick up free variables from the environment
    const initialValues: InitialValues = {
      input: argsWithClosures,
      // OptionsArgs are set at the blueprint level. For user-defined bricks, are passed via brick inputs
      optionsArgs: undefined,
      // Services are passed as inputs to the brick
      serviceContext: undefined,
      root: options.root,
    };

    if (isContentScript()) {
      // Already in the contentScript, run the pipeline directly for performance
      return reducePipeline(this.component.pipeline, initialValues, {
        logger: options.logger,
        headless: options.headless,
        // The component uses its declared version of the runtime API, regardless of what version of the runtime
        // is used to call the component
        ...apiVersionOptions(this.component.apiVersion),
        // Provide the run metadata (runId, branches) so that calls to pipeline functions trace correctly
        ...options.meta,
      });
    }

    // The brick is being run as a renderer from a modal or a sidebar. Run the logic in the contentScript and return the
    // renderer. The caller can't run the whole brick in the contentScript because renderers can return React
    // Components which can't be serialized across messenger boundaries.

    // Note: This code can be run either in the sidebar or in a modal
    const topLevelFrame = await getConnectedTarget();

    try {
      return await runHeadlessPipeline(topLevelFrame, {
        nonce: uuidv4(),
        // OptionsArgs are set at the blueprint level. For user-defined bricks, are passed via brick inputs
        context: validateBrickArgsContext({
          "@input": argsWithClosures,
          "@options": {},
        }),
        pipeline: castArray(this.component.pipeline),
        options: apiVersionOptions(this.apiVersion),
        messageContext: options.logger.context,
        // Provide the run metadata (runId, branches) so that calls to pipeline functions trace correctly
        meta: options.meta,
      });
    } catch (error) {
      if (isSpecificError(error, HeadlessModeError)) {
        const continuation = error;
        const renderer = await this.registry.lookup(continuation.blockId);
        return renderer.run(continuation.args, {
          ...options,
          ctxt: continuation.ctxt,
          // XXX: should this a fresh logger for the platform?
          logger: options.logger.childLogger(continuation.loggerContext),
        });
      }

      throw error;
    }
  }
}

// Put registry first for easier partial application
export function fromJS(
  registry: BrickRegistryProtocol,
  component: UnknownObject,
): Brick {
  if (component.kind == null) {
    throw new InvalidDefinitionError(
      "Component definition is missing a 'kind' property",
      null,
    );
  }

  if (component.kind === DefinitionKinds.READER) {
    return readerFactory(component);
  }

  validateBrickDefinition(component);
  return new UserDefinedBrick(registry, component);
}
