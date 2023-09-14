import ConsoleLogger from "@/utils/ConsoleLogger";
import { propertiesToSchema } from "@/validators/generic";
import { type InitialValues } from "@/runtime/reducePipeline";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { mapArgs } from "@/runtime/mapArgs";
import { BusinessError } from "@/errors/businessErrors";
import { UNSET_UUID, validateRegistryId } from "@/types/helpers";
import {
  type ApiVersion,
  type BrickArgs,
  type BrickOptions,
  type OptionsArgs,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { BrickABC } from "@/types/brickTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { type Schema } from "@/types/schemaTypes";
import { isDeferExpression } from "@/utils/expressionUtils";
import isPromise from "is-promise";

const logger = new ConsoleLogger();

export class ContextBrick extends BrickABC {
  static BLOCK_ID = validateRegistryId("test/context");

  static contexts: UnknownObject[] = [];

  constructor() {
    super(ContextBrick.BLOCK_ID, "Return Context");
  }

  static clearContexts() {
    ContextBrick.contexts = [];
  }

  inputSchema = propertiesToSchema({});

  async run(arg: BrickArgs, { ctxt }: BrickOptions) {
    ContextBrick.contexts.push(ctxt);
    return ctxt;
  }
}

export class EchoBrick extends BrickABC {
  static BLOCK_ID = validateRegistryId("test/echo");
  constructor() {
    super(EchoBrick.BLOCK_ID, "Echo Brick");
  }

  inputSchema = propertiesToSchema({
    message: {
      type: "string",
    },
  });

  async run({ message }: BrickArgs) {
    return { message };
  }
}

export class DeferredEchoBrick extends BrickABC {
  static BLOCK_ID = validateRegistryId("test/deferred");
  readonly promiseOrFactory: Promise<unknown> | (() => Promise<unknown>);
  constructor(promiseOrFactory: Promise<unknown> | (() => Promise<unknown>)) {
    super(DeferredEchoBrick.BLOCK_ID, "Deferred Brick");
    this.promiseOrFactory = promiseOrFactory;
  }

  inputSchema = propertiesToSchema({
    message: {
      type: "string",
    },
  });

  async run({ message }: BrickArgs) {
    if (isPromise(this.promiseOrFactory)) {
      await this.promiseOrFactory;
    } else {
      await this.promiseOrFactory();
    }

    await this.promiseOrFactory;
    return { message };
  }
}

class RootAwareBrick extends BrickABC {
  constructor() {
    super("test/root-aware", "Root Aware");
  }

  inputSchema = propertiesToSchema({});

  async run(_arg: BrickArgs, { root }: BrickOptions) {
    return {
      tagName: (root as HTMLElement).tagName,
    };
  }
}

/**
 * A brick that returns a `prop` 🫖
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418
 */
class TeapotBrick extends BrickABC {
  constructor() {
    super("test/teapot", "Teapot Brick");
  }

  inputSchema = propertiesToSchema({});

  async run() {
    return { prop: "I'm a teapot" };
  }
}

class IdentityBrick extends BrickABC {
  constructor() {
    super("test/identity", "Identity Brick");
  }

  inputSchema = propertiesToSchema({
    data: {},
  });

  async run(arg: BrickArgs) {
    return arg;
  }
}

export class ThrowBrick extends BrickABC {
  static BRICK_ID = validateRegistryId("test/throw");

  constructor() {
    super(ThrowBrick.BRICK_ID, "Throw Brick");
  }

  inputSchema = propertiesToSchema(
    {
      message: {
        type: "string",
      },
    },
    []
  );

  async run({
    message = "Default Business Error",
  }: BrickArgs<{ message?: string }>) {
    throw new BusinessError(message);
  }
}

class ArrayBrick extends BrickABC {
  constructor() {
    super("test/array", "Array Brick");
  }

  inputSchema = propertiesToSchema({});

  async run() {
    return [{ value: "foo" }, { value: "bar" }];
  }
}

// TODO: write a schema in schemas directory. The one in component.json is incomplete
const pipelineSchema: Schema = {
  type: "object",
  properties: {
    __type__: {
      type: "string",
      const: "pipeline",
    },
    __value__: {
      type: "array",
      items: {
        properties: {
          id: {
            type: "string",
          },
          config: {
            type: "object",
          },
        },
        required: ["id"],
      },
    },
  },
};

/**
 * A brick for testing pipeline functionality. Returns the length of the provided pipeline brick input.
 */
class PipelineBrick extends BrickABC {
  constructor() {
    super("test/pipeline", "Pipeline Brick");
  }

  inputSchema = propertiesToSchema({
    pipeline: pipelineSchema,
  });

  async run({ pipeline }: BrickArgs<{ pipeline: PipelineExpression }>) {
    return {
      length: pipeline.__value__.length,
    };
  }
}

/**
 * Test brick that renders an array of elements with a deferred expression
 */
class DeferBrick extends BrickABC {
  constructor() {
    super("test/defer", "Defer Brick");
  }

  inputSchema = propertiesToSchema(
    {
      array: {
        type: "array",
      },
      elementKey: {
        type: "string",
        default: "element",
      },
      element: {
        type: "object",
        additionalProperties: true,
      },
    },
    ["array", "element"]
  );

  async run(
    {
      element,
      array = [],
      elementKey = "element",
    }: BrickArgs<{
      element: UnknownObject;
      array: unknown[];
      elementKey?: string;
    }>,
    { ctxt }: BrickOptions
  ) {
    return Promise.all(
      array.map(async (data) => {
        const elementContext = {
          ...ctxt,
          [`@${elementKey}`]: data,
        };

        if (isDeferExpression(element)) {
          return mapArgs(element.__value__, elementContext, {
            implicitRender: null,
            ...apiVersionOptions("v3"),
          });
        }

        return element;
      })
    );
  }
}

export const echoBrick = new EchoBrick();

export const contextBrick = new ContextBrick();
export const identityBrick = new IdentityBrick();
export const throwBrick = new ThrowBrick();
export const teapotBrick = new TeapotBrick();
export const arrayBrick = new ArrayBrick();
export const pipelineBrick = new PipelineBrick();
export const deferBrick = new DeferBrick();
export const rootAwareBrick = new RootAwareBrick();

/**
 * Helper method to pass only `input` to reducePipeline.
 */
export function simpleInput(input: UnknownObject): InitialValues {
  return {
    input,
    root: null,
    serviceContext: {},
    optionsArgs: {} as OptionsArgs,
  };
}

/**
 * Common reducePipeline options
 */
export function testOptions(version: ApiVersion) {
  return {
    logger,
    extensionId: UNSET_UUID,
    ...apiVersionOptions(version),
  };
}
