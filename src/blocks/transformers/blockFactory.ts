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

import { BrickABC, type Brick } from "@/types/blockTypes";
import { readerFactory } from "@/blocks/readers/factory";
import {
  type Schema as ValidatorSchema,
  Validator,
} from "@cfworker/json-schema";
import { castArray, cloneDeep, pickBy } from "lodash";
import { type InitialValues, reducePipeline } from "@/runtime/reducePipeline";
import { dereference } from "@/validators/generic";
import blockSchema from "@schemas/component.json";
import blockRegistry from "@/blocks/registry";
import { type BrickConfig, type BlockPipeline } from "@/blocks/types";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import getType from "@/runtime/getType";
import { type BrickType } from "@/runtime/runtimeTypes";
import { InvalidDefinitionError } from "@/errors/businessErrors";
import {
  type ApiVersion,
  type BrickArgs,
  type BlockOptions,
} from "@/types/runtimeTypes";
import { type Schema, type UiSchema } from "@/types/schemaTypes";
import {
  type Metadata,
  type RegistryId,
  type SemVerString,
} from "@/types/registryTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { inputProperties } from "@/helpers";
import { isPipelineExpression } from "@/runtime/mapArgs";

type BrickDefinition = {
  apiVersion?: ApiVersion;
  kind: "component";
  metadata: Metadata;
  defaultOptions: Record<string, string>;
  pipeline: BrickConfig | BlockPipeline;
  inputSchema: Schema;
  /**
   * An optional RJSF uiSchema for inputs.
   *
   * Currently only supports the ui:order property.
   *
   * @since 1.7.16
   */
  uiSchema?: UiSchema;
  outputSchema?: Schema;

  // Mapping from `key` -> `serviceId`
  services?: Record<string, RegistryId>;
};

function validateBrickDefinition(
  component: unknown
): asserts component is BrickDefinition {
  const validator = new Validator(
    dereference(blockSchema as Schema) as ValidatorSchema
  );
  const result = validator.validate(component);
  if (!result.valid) {
    console.warn("Invalid block configuration", {
      component,
      result,
    });
    throw new InvalidDefinitionError(
      "Invalid block configuration",
      result.errors
    );
  }
}

/**
 * A non-native (i.e., non-JS) BrickABC. Typically defined in YAML/JSON.
 */
class ExternalBlock extends BrickABC {
  public readonly component: BrickDefinition;

  readonly apiVersion: ApiVersion;

  readonly inputSchema: Schema;

  readonly uiSchema?: UiSchema;

  readonly version: SemVerString;

  constructor(component: BrickDefinition) {
    const { id, name, description, icon, version } = component.metadata;
    super(id, name, description, icon);
    this.apiVersion = component.apiVersion ?? "v1";
    this.component = component;
    this.inputSchema = this.component.inputSchema;
    this.uiSchema = this.component.uiSchema;
    this.outputSchema = this.component.outputSchema;
    this.version = version;
  }

  override async isPure(): Promise<boolean> {
    const pipeline = castArray(this.component.pipeline);

    const purity = await Promise.all(
      pipeline.map(async (blockConfig) => {
        const resolvedBlock = await blockRegistry.lookup(blockConfig.id);
        return resolvedBlock.isPure();
      })
    );

    return purity.every(Boolean);
  }

  override async isRootAware(): Promise<boolean> {
    const pipeline = castArray(this.component.pipeline);

    const awareness = await Promise.all(
      pipeline.map(async (blockConfig) => {
        const resolvedBlock = await blockRegistry.lookup(blockConfig.id);
        return resolvedBlock.isRootAware();
      })
    );

    return awareness.some(Boolean);
  }

  async inferType(): Promise<BrickType | null> {
    const pipeline = castArray(this.component.pipeline);
    const last = pipeline.at(-1);

    try {
      const block = await blockRegistry.lookup(last.id);
      return await getType(block);
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
   * because ExternalBlock is currently the only block that switches the context. (The control flow bricks, e.g.,
   * try-except extend the context, but don't swap out the "@input", "@options", etc.).
   *
   * TODO: also track for deferred expressions. (Currently, deferred expressions only appear in the Document Builder.).
   *  Deferred expressions don't have a JSON Schema $ref type.
   *
   * Read more: https://en.wikipedia.org/wiki/Closure_(computer_programming)
   * @private
   */
  private capturePipelineClosures(
    args: BrickArgs,
    options: BlockOptions
  ): BrickArgs {
    const pipelinePropertyNames = Object.keys(
      pickBy(
        inputProperties(this.inputSchema),
        (value) =>
          typeof value === "object" &&
          value.$ref === "https://app.pixiebrix.com/schemas/pipeline#"
      )
    );

    if (typeof args === "object" && pipelinePropertyNames.length > 0) {
      const fresh = cloneDeep(args);

      for (const name of pipelinePropertyNames) {
        // eslint-disable-next-line security/detect-object-injection -- from inputSchema
        if (Object.hasOwn(fresh, name) && isPipelineExpression(fresh[name])) {
          // eslint-disable-next-line security/detect-object-injection -- from inputSchema
          fresh[name].__env__ = options.ctxt;
        }
      }

      return fresh;
    }

    return args;
  }

  async run(args: BrickArgs, options: BlockOptions): Promise<unknown> {
    const argsWithClosures = this.capturePipelineClosures(args, options);

    options.logger.debug("Running component pipeline", {
      args: argsWithClosures,
    });

    // Blocks only have inputs, they can't pick up free variables from the environment
    const initialValues: InitialValues = {
      input: argsWithClosures,
      // OptionsArgs are set at the blueprint level. For composite bricks, the options should be passed in
      // as part of the brick inputs
      optionsArgs: undefined,
      // Services are passed as inputs to the brick
      serviceContext: undefined,
      root: options.root,
    };

    return reducePipeline(this.component.pipeline, initialValues, {
      logger: options.logger,
      headless: options.headless,
      // The component uses its declared version of the runtime API, regardless of what version of the runtime
      // is used to call the component
      ...apiVersionOptions(this.component.apiVersion),
    });
  }
}

export function fromJS(component: UnknownObject): Brick {
  if (component.kind == null) {
    throw new InvalidDefinitionError(
      "Component definition is missing a 'kind' property",
      null
    );
  }

  if (component.kind === "reader") {
    return readerFactory(component);
  }

  validateBrickDefinition(component);
  return new ExternalBlock(component);
}
