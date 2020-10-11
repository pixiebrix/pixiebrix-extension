import { Block } from "@/types";
import { readerFactory } from "@/blocks/readers/factory";
import { Validator, Schema as ValidatorSchema } from "@cfworker/json-schema";
import { ValidationError } from "@/errors";
import {
  BlockConfig,
  BlockPipeline,
  reducePipeline,
} from "@/blocks/combinators";
import { BlockArg, BlockOptions, IBlock, Metadata, Schema } from "@/core";
import { dereference } from "@/validators/generic";
import blockSchema from "@schemas/component.json";

const KIND_MAP = {
  component: "render",
  effect: "effect",
  transform: "transform",
};

type ComponentKind = "reader" | "component" | "effect" | "transform";

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
    this[KIND_MAP[kind]] = (renderedInputs: BlockArg, options: BlockOptions) =>
      this.run(renderedInputs, options);
  }

  async run(renderedInputs: BlockArg, options: BlockOptions): Promise<unknown> {
    return await reducePipeline(this.component.pipeline, renderedInputs);
  }
}

export function fromJS(component: any): IBlock {
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
