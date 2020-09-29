import {
  InputValidationError,
  reducePipeline,
  mergeReaders,
} from "@/blocks/combinators";
import blockRegistry from "@/blocks/registry";
import { Block, Reader } from "@/types";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg } from "@/core";
import { JQTransformer } from "@/blocks/transformers";

class EchoBlock extends Block {
  constructor() {
    super("test/echo", "Echo Block");
  }

  inputSchema = propertiesToSchema({
    message: {
      type: "string",
    },
  });

  async run({ message }: BlockArg) {
    return { message };
  }
}

class DumbReader extends Reader {
  constructor() {
    super("test/reader", "Dumb Reader");
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  outputSchema = propertiesToSchema({
    message: {
      type: "string",
    },
  });

  async read() {
    return { value: 42 };
  }
}

const block = new EchoBlock();
const reader = new DumbReader();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(block, reader);
});

test("reducePipeline can run a single block", async () => {
  const pipelineConfig = {
    id: block.id,
    config: { message: "{{inputArg}}" },
  };
  const result = await reducePipeline(pipelineConfig, { inputArg: "hello" });
  expect(result).toStrictEqual({ message: "hello" });
});

test("reducePipeline throws error on wrong input type", async () => {
  const pipelineConfig = {
    id: block.id,
    config: { message: "{{inputArg}}" },
  };
  try {
    await reducePipeline(pipelineConfig, { inputArg: 42 });
  } catch (exc) {
    expect(exc).toBeInstanceOf(InputValidationError);
  }
});

test("reducePipeline throws error on missing input", async () => {
  const pipelineConfig = {
    id: block.id,
    config: { message: "{{inputArg}}" },
  };
  try {
    await reducePipeline(pipelineConfig, {});
  } catch (exc) {
    expect(exc).toBeInstanceOf(InputValidationError);
  }
});

test("reducePipeline supports output key", async () => {
  const pipelineConfig = [
    {
      id: block.id,
      outputKey: "foo",
      config: { message: "{{inputArg}}" },
    },
    {
      id: block.id,
      config: { message: "hello, {{@foo.message}}" },
    },
  ];
  const result = await reducePipeline(pipelineConfig, { inputArg: "bar" });
  expect(result).toStrictEqual({ message: "hello, bar" });
});

test("reducePipeline can pipeline outputs", async () => {
  const pipelineConfig = [
    {
      id: block.id,
      config: { message: "{{inputArg}}" },
    },
    {
      id: block.id,
      config: { message: "hello, {{message}}" },
    },
  ];
  const result = await reducePipeline(pipelineConfig, { inputArg: "bar" });
  expect(result).toStrictEqual({ message: "hello, bar" });
});

test("merge single reader", async () => {
  const block = new EchoBlock();
  blockRegistry.register(block);
  const merged = mergeReaders(reader.id);
  expect(await merged.read()).toStrictEqual({ value: 42 });
});

test("merge keyed readers", async () => {
  const block = new EchoBlock();
  blockRegistry.register(block);
  const merged = mergeReaders({
    key1: reader.id,
    key2: reader.id,
  });
  expect(await merged.read()).toStrictEqual({
    key1: { value: 42 },
    key2: { value: 42 },
  });
});

test("merge array of readers", async () => {
  const block = new EchoBlock();
  blockRegistry.register(block);
  const merged = mergeReaders([reader.id, reader.id]);
  expect(await merged.read()).toStrictEqual({ value: 42 });
});

test("outputKey preserves context", async () => {
  const initialContext = { inputArg: "bar" };
  const pipelineConfig = [
    {
      id: block.id,
      outputKey: "foo",
      config: { message: "inputArg" },
    },
  ];
  const result = await reducePipeline(pipelineConfig, initialContext);
  expect(result).toStrictEqual(initialContext);
});

test("jq transform using context", async () => {
  const jq = new JQTransformer();
  blockRegistry.register(jq);

  const initialContext = { array: [{ field: "foo" }] };
  const pipelineConfig = [
    {
      id: block.id,
      outputKey: "ignored",
      config: { message: "inputArg" },
    },
    {
      id: jq.id,
      config: { filter: ".array | map(.field)" },
    },
  ];
  const result = await reducePipeline(pipelineConfig, initialContext);
  expect(result).toStrictEqual(["foo"]);
});
