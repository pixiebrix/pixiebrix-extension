import { type InitialValues } from "@/runtime/reducePipeline";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { mapArgs } from "@/runtime/mapArgs";
import { BusinessError } from "@/errors/businessErrors";
import { validateRegistryId } from "@/types/helpers";
import {
  type BrickArgs,
  type BrickOptions,
  type OptionsArgs,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { BrickABC } from "@/types/brickTypes";
import { type Schema } from "@/types/schemaTypes";
import { isDeferExpression } from "@/utils/expressionUtils";
import isPromise from "is-promise";
import { type JsonValue } from "type-fest";
import { minimalSchemaFactory, propertiesToSchema } from "@/utils/schemaUtils";

/**
 * A test helper brick that returns and stores the BrickOptions.context.
 */
export class ContextBrick extends BrickABC {
  static BRICK_ID = validateRegistryId("test/context");

  static contexts: UnknownObject[] = [];

  constructor() {
    super(ContextBrick.BRICK_ID, "Return Context");
  }

  static clearContexts() {
    ContextBrick.contexts = [];
  }

  inputSchema = propertiesToSchema({}, []);

  async run(_arg: BrickArgs, { ctxt }: BrickOptions) {
    ContextBrick.contexts.push(ctxt);
    return ctxt;
  }
}

/**
 * A test helper brick that returns and stores the brick options it was called with.
 */
export class OptionsBrick extends BrickABC {
  static BRICK_ID = validateRegistryId("test/options");

  static options: BrickOptions[] = [];

  constructor() {
    super(OptionsBrick.BRICK_ID, "Return Options");
  }

  static clearOptions() {
    OptionsBrick.options = [];
  }

  inputSchema = propertiesToSchema({}, []);

  async run(_arg: BrickArgs, options: BrickOptions): Promise<JsonValue> {
    OptionsBrick.options.push(options);
    return JSON.parse(JSON.stringify(options));
  }
}

/**
 * A test helper brick that echos a message.
 */
export class EchoBrick extends BrickABC {
  static BRICK_ID = validateRegistryId("test/echo");
  constructor() {
    super(EchoBrick.BRICK_ID, "Echo Brick");
  }

  inputSchema = propertiesToSchema(
    {
      message: {
        type: "string",
      },
    },
    ["message"],
  );

  async run({ message }: BrickArgs<{ message: string }>) {
    return { message };
  }
}

/**
 * A test helper brick that is behind a feature flag
 */
class FeatureFlagBrick extends BrickABC {
  static BRICK_ID = validateRegistryId("test/flagged");

  featureFlag = "test-flag-brick";

  constructor() {
    super(FeatureFlagBrick.BRICK_ID, "Feature Flagged Brick");
  }

  inputSchema = minimalSchemaFactory();

  async run() {
    return {};
  }
}

export class DeferredEchoBrick extends BrickABC {
  static BRICK_ID = validateRegistryId("test/deferred");
  readonly promiseOrFactory: Promise<unknown> | (() => Promise<unknown>);
  constructor(promiseOrFactory: Promise<unknown> | (() => Promise<unknown>)) {
    super(DeferredEchoBrick.BRICK_ID, "Deferred Brick");
    this.promiseOrFactory = promiseOrFactory;
  }

  inputSchema = propertiesToSchema(
    {
      message: {
        type: "string",
      },
    },
    ["message"],
  );

  async run({ message }: BrickArgs<{ message: string }>) {
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

  inputSchema = propertiesToSchema({}, []);

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

  inputSchema = propertiesToSchema({}, []);

  async run() {
    return { prop: "I'm a teapot" };
  }
}

class IdentityBrick extends BrickABC {
  constructor() {
    super("test/identity", "Identity Brick");
  }

  inputSchema = propertiesToSchema(
    {
      data: {},
    },
    ["data"],
  );

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
    [],
  );

  async run({
    message = "Default Business Error",
  }: BrickArgs<{ message?: string }>) {
    throw new BusinessError(message);
  }
}

export class ThrowTwiceBrick extends BrickABC {
  static BRICK_ID = validateRegistryId("test/throw-twice");
  private timesThrown: number;
  private get maxThrows() {
    return 2;
  }

  constructor() {
    super(ThrowTwiceBrick.BRICK_ID, "Throw Twice Brick");
    this.timesThrown = 0;
  }

  inputSchema = propertiesToSchema(
    {
      message: {
        type: "string",
      },
    },
    [],
  );

  async run({
    message = "Default Business Error",
  }: BrickArgs<{ message?: string }>) {
    if (this.maxThrows && this.timesThrown >= this.maxThrows) {
      return { prop: "no error!" };
    }

    this.timesThrown += 1;
    throw new BusinessError(message);
  }
}

class ArrayBrick extends BrickABC {
  constructor() {
    super("test/array", "Array Brick");
  }

  inputSchema = propertiesToSchema({}, []);

  async run() {
    return [{ value: "foo" }, { value: "bar" }];
  }
}

// TODO: write a schema in schemas directory. The one in component.json is incomplete
const pipelineSchema: Schema = {
  type: "object",
  // eslint-disable-next-line local-rules/noExpressionLiterals -- JSON Schema
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

  inputSchema = propertiesToSchema(
    {
      pipeline: pipelineSchema,
    },
    ["pipeline"],
  );

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
    ["array", "element"],
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
    { ctxt }: BrickOptions,
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
      }),
    );
  }
}

export const echoBrick = new EchoBrick();
export const contextBrick = new ContextBrick();
export const optionsBrick = new OptionsBrick();
export const identityBrick = new IdentityBrick();
export const throwBrick = new ThrowBrick();
export const teapotBrick = new TeapotBrick();
export const arrayBrick = new ArrayBrick();
export const pipelineBrick = new PipelineBrick();
export const deferBrick = new DeferBrick();
export const rootAwareBrick = new RootAwareBrick();
export const featureFlagBrick = new FeatureFlagBrick();

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
