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

import { Block } from "@/types";
import { readerFactory } from "@/blocks/readers/factory";
import { Validator, Schema as ValidatorSchema } from "@cfworker/json-schema";
import { ValidationError } from "@/errors";
import { castArray } from "lodash";
import {
  BlockConfig,
  BlockPipeline,
  reducePipeline,
} from "@/blocks/combinators";
import { BlockArg, BlockOptions, IBlock, Metadata, Schema } from "@/core";
import { dereference } from "@/validators/generic";
import blockSchema from "@schemas/component.json";
import blockRegistry from "@/blocks/registry";
import { getType } from "@/blocks/util";

type ComponentKind =
  | "reader"
  | "component"
  | "effect"
  | "transform"
  | "renderer";

const METHOD_MAP: Map<ComponentKind, string> = new Map([
  ["reader", "read"],
  ["effect", "effect"],
  ["transform", "transform"],
]);

interface ComponentConfig {
  kind: ComponentKind;
  metadata: Metadata;
  defaultOptions: { [key: string]: string };
  pipeline: BlockConfig | BlockPipeline;
  inputSchema: Schema;
  services?: { [key: string]: string };
}

function validateBlockDefinition(
  component: any
): asserts component is ComponentConfig {
  const validator = new Validator(
    dereference(blockSchema as Schema) as ValidatorSchema
  );
  const result = validator.validate(component);
  if (!result.valid) {
    console.warn(
      `Invalid block configuration (kind=${component.kind})`,
      result
    );
    throw new ValidationError("Invalid block configuration", result.errors);
  }
}

class ExternalBlock extends Block {
  private component: ComponentConfig;
  readonly inputSchema: Schema;
  readonly defaultOptions: { [key: string]: any };

  constructor(component: ComponentConfig) {
    const { id, name, description, icon } = component.metadata;
    super(id, name, description, icon);
    this.component = component;
    this.inputSchema = this.component.inputSchema;

    const kind = component.kind ?? ("transform" as ComponentKind);

    if (kind === "reader") {
      throw new Error("Cannot deserialize reader as block");
    }

    // @ts-ignore: we're being dynamic here to set the corresponding method for the kind since
    // we use that method to distinguish between block types in places
    this[METHOD_MAP.get(kind)] = (
      renderedInputs: BlockArg,
      options: BlockOptions
    ) => this.run(renderedInputs, options);
  }

  async inferType(): Promise<ComponentKind | null> {
    const pipeline = castArray(this.component.pipeline);
    const last = pipeline[pipeline.length - 1];

    try {
      const block = await blockRegistry.lookup(last.id);
      return await getType(block);
    } catch {
      return null;
    }
  }

  async run(renderedInputs: BlockArg, options: BlockOptions): Promise<unknown> {
    return reducePipeline(
      this.component.pipeline,
      renderedInputs,
      options.logger,
      options.root,
      {
        headless: options.headless,
        // optionsArgs are set at the blueprint level. For composite bricks, they options should be passed in
        // at part of the brick inputs
        optionsArgs: undefined,
      }
    );
  }
}

export function fromJS(component: Record<string, unknown>): IBlock {
  if (component.kind == null) {
    throw new ValidationError(
      "Component definition is missing a 'kind' property",
      null
    );
  } else if (component.kind === "reader") {
    return readerFactory(component);
  }

  validateBlockDefinition(component);
  return new ExternalBlock(component);
}
