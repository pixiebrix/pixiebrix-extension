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

import nytimes from "@contrib/bricks/nytimes-org.yaml";
import trelloReader from "@contrib/readers/trello-card-reader.yaml";
import { fromJS as nativeFromJS } from "@/bricks/transformers/brickFactory";
import { InvalidDefinitionError } from "@/errors/businessErrors";
import { isUserDefinedBrick } from "@/types/brickTypes";
import { MappingTransformer } from "./mapping";
import brickRegistry from "@/bricks/registry";
import {
  ContextBrick,
  contextBrick,
  OptionsBrick,
  optionsBrick,
  simpleInput,
  testOptions,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import Run from "@/bricks/transformers/controlFlow/Run";
import { cloneDeep, partial } from "lodash";
import { extraEmptyModStateContext } from "@/runtime/extendModVariableContext";
import { TEST_setContext } from "webext-detect";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";

import { toExpression } from "@/utils/expressionUtils";
import { DefinitionKinds } from "@/types/registryTypes";

TEST_setContext("contentScript");

const fromJS = partial(nativeFromJS, brickRegistry);

beforeAll(() => {
  registerBuiltinBricks();
});

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([contextBrick, optionsBrick]);
  ContextBrick.clearContexts();
  OptionsBrick.clearOptions();
});

test("two plus two is four", () => {
  expect(2 + 2).toBe(4);
});

test("can read yaml fixture", () => {
  expect(nytimes.kind).toBe("component");
});

test("can read nytimes articles", async () => {
  const block = fromJS(nytimes);
  expect(block.id).toBe("nytimes/organization-articles");
});

test("can read trello reader", async () => {
  const block = fromJS(trelloReader);
  expect(block.id).toBe("trello/card");
});

test("reader includes version", async () => {
  const block = fromJS(trelloReader);
  expect(block.version).toBe("0.0.1");
});

test("block includes version", async () => {
  const block = fromJS(nytimes);
  expect(block.version).toBe("0.0.1");
});

test("reject invalid fixture", async () => {
  try {
    fromJS({ foo: "bar" });
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidDefinitionError);
  }
});

describe("defaultOutputKey", () => {
  test("no output key", () => {
    const block = fromJS(nytimes);
    expect(block.defaultOutputKey).toBeNull();
  });

  test("output key", () => {
    const config = cloneDeep(nytimes);
    config.defaultOutputKey = "articles";

    const block = fromJS(config);
    expect(block.defaultOutputKey).toBe("articles");
  });
});

describe("isUserDefinedBrick", () => {
  test("is detected as user-defined block", () => {
    expect(isUserDefinedBrick(fromJS(nytimes))).toBe(true);
  });

  test("is detected as built-in block", () => {
    expect(isUserDefinedBrick(new MappingTransformer())).toBe(false);
  });
});

test("inner pipelines receive correct context", async () => {
  const json = {
    apiVersion: "v3",
    kind: DefinitionKinds.BRICK,
    metadata: {
      id: "test/pipeline-echo",
      name: "Pipeline Echo brick",
    },
    inputSchema: {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {
        customInput: {
          type: "string",
        },
        body: {
          $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        },
      },
      required: ["customInput", "body"],
    },
    pipeline: [
      {
        id: "test/context",
        label: "Pipeline Echo Brick Context",
        config: {},
        outputKey: "ignore",
      },
      {
        id: "@pixiebrix/run",
        config: {
          body: toExpression("var", "@input.body"),
        },
      },
    ],
  };

  const block = fromJS(json);
  brickRegistry.register([block, new Run()]);

  const pipeline = {
    id: block.id,
    config: {
      customInput: "Brick Environment",
      body: toExpression("pipeline", [
        {
          id: validateRegistryId("test/context"),
          label: "Pipeline Arg Context",
          config: {},
        },
      ]),
    },
  };

  await reducePipeline(
    pipeline,
    simpleInput({ customInput: "Closure Environment" }),
    testOptions("v3"),
  );

  expect(ContextBrick.contexts[0]).toStrictEqual({
    "@input": {
      body: {
        __env__: expect.toBeObject(),
        __type__: "pipeline",
        __value__: expect.toBeArray(),
      },
      customInput: "Brick Environment",
    },
    ...extraEmptyModStateContext("v3"),
    "@options": {},
  });

  expect(ContextBrick.contexts[1]).toStrictEqual({
    "@input": {
      customInput: "Closure Environment",
    },
    ...extraEmptyModStateContext("v3"),
    "@options": {},
  });
});

describe("getModVariableSchema", () => {
  it("unions mod variables", async () => {
    const json = {
      apiVersion: "v3",
      kind: DefinitionKinds.BRICK,
      metadata: {
        id: "test/pipeline-echo",
        name: "State Brick",
      },
      inputSchema: {
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {},
      },
      pipeline: [
        {
          id: "@pixiebrix/state/assign",
          label: "Assign Foo",
          config: {
            variableName: "foo",
            value: 42,
          },
          outputKey: "ignore",
        },
        {
          id: "@pixiebrix/state/assign",
          label: "Assign Bar",
          config: {
            variableName: "bar",
            value: 42,
          },
          outputKey: "ignore",
        },
        {
          id: "test/context",
          label: "Pipeline Echo Brick Context",
          config: {},
          outputKey: "ignore",
        },
      ],
    };

    const brick = fromJS(json);
    await expect(
      brick.getModVariableSchema({
        id: validateRegistryId("test/pipeline-echo"),
        config: {},
      }),
    ).resolves.toEqual({
      type: "object",
      additionalProperties: false,
      properties: {
        foo: true,
        bar: true,
      },
      required: [],
    });
  });
});

describe("isPageStateAware", () => {
  it("detects any page state aware blocks", async () => {
    const json = {
      apiVersion: "v3",
      kind: DefinitionKinds.BRICK,
      metadata: {
        id: "test/pipeline-echo",
        name: "State Brick",
      },
      inputSchema: {
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {},
      },
      pipeline: [
        {
          id: "@pixiebrix/state/get",
          label: "Get State",
          config: {},
          outputKey: "ignore",
        },
        {
          id: "test/context",
          label: "Pipeline Echo Brick Context",
          config: {},
          outputKey: "ignore",
        },
      ],
    };

    const brick = fromJS(json);
    await expect(brick.isPageStateAware()).resolves.toBe(true);
  });

  it("requires at least one page state brick", async () => {
    const json = {
      apiVersion: "v3",
      kind: DefinitionKinds.BRICK,
      metadata: {
        id: "test/pipeline-echo",
        name: "State Brick",
      },
      inputSchema: {
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {},
      },
      pipeline: [
        {
          id: "test/context",
          label: "Pipeline Echo Brick Context",
          config: {},
          outputKey: "ignore",
        },
      ],
    };

    const brick = fromJS(json);
    await expect(brick.isPageStateAware()).resolves.toBe(false);
  });
});

describe("tracing", () => {
  it("passes branches to inner blocks", async () => {
    const json = {
      apiVersion: "v3",
      kind: DefinitionKinds.BRICK,
      metadata: {
        id: "test/pipeline-echo",
        name: "Pipeline Echo brick",
      },
      inputSchema: {
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {
          customInput: {
            type: "string",
          },
          body: {
            $ref: "https://app.pixiebrix.com/schemas/pipeline#",
          },
        },
        required: ["customInput", "body"],
      },
      pipeline: [
        {
          id: "test/options",
          label: "Pipeline Echo Brick Options",
          config: {},
          outputKey: "ignore",
        },
        {
          id: "@pixiebrix/run",
          config: {
            body: toExpression("var", "@input.body"),
          },
        },
      ],
    };

    const block = fromJS(json);
    brickRegistry.register([block, new Run()]);

    const pipeline = {
      id: block.id,
      config: {
        customInput: "Brick Environment",
        body: toExpression("pipeline", [
          {
            id: validateRegistryId("test/options"),
            label: "Pipeline Arg Options",
            config: {},
          },
        ]),
      },
    };

    const runId = uuidv4();
    const extensionId = uuidv4();
    // Provide initial value to ensure it's preserved
    const initialBranches = [{ key: "body", counter: 1 }];

    await reducePipeline(
      pipeline,
      simpleInput({ customInput: "Closure Environment" }),
      {
        ...testOptions("v3"),
        runId,
        modComponentId: extensionId,
        branches: initialBranches,
      },
    );

    expect(OptionsBrick.options[0].meta).toStrictEqual({
      runId,
      extensionId,
      branches: initialBranches,
    });

    expect(OptionsBrick.options[1].meta).toStrictEqual({
      runId,
      extensionId,
      branches: [
        ...initialBranches,
        // Branch is added by the @pixiebrix/run brick
        { key: "body", counter: 0 },
      ],
    });
  });
});
