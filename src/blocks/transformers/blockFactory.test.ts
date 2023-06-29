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

import nytimes from "@contrib/blocks/nytimes-org.yaml";
import trelloReader from "@contrib/readers/trello-card-reader.yaml";
import { fromJS } from "@/blocks/transformers/blockFactory";
import { InvalidDefinitionError } from "@/errors/businessErrors";
import { isUserDefinedBlock } from "@/types/blockTypes";
import { MappingTransformer } from "./mapping";
import blockRegistry from "@/blocks/registry";
import {
  ContextBlock,
  contextBlock,
  simpleInput,
  testOptions,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { reducePipeline } from "@/runtime/reducePipeline";
import Run from "@/blocks/transformers/controlFlow/Run";

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register([contextBlock]);
  ContextBlock.clearContexts();
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

test("reject invalid fixture fixture", async () => {
  try {
    fromJS({ foo: "bar" });
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidDefinitionError);
  }
});

describe("isUserDefinedBlock", () => {
  test("is detected as user-defined block", () => {
    expect(isUserDefinedBlock(fromJS(nytimes))).toBe(true);
  });

  test("is detected as built-in block", () => {
    expect(isUserDefinedBlock(new MappingTransformer())).toBe(false);
  });
});

test("inner pipelines receive correct context", async () => {
  const json = {
    apiVersion: "v3",
    kind: "component",
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
          body: {
            __type__: "var",
            __value__: "@input.body",
          },
        },
      },
    ],
  };

  const block = fromJS(json);
  blockRegistry.register([block, new Run()]);

  const pipeline = {
    id: block.id,
    config: {
      customInput: "BrickABC Environment",
      body: {
        __type__: "pipeline",
        __value__: [{ id: "test/context", label: "Pipeline Arg Context" }],
      },
    },
  };

  await reducePipeline(
    pipeline,
    simpleInput({ customInput: "Closure Environment" }),
    testOptions("v3")
  );

  expect(ContextBlock.contexts[0]).toStrictEqual({
    "@input": {
      body: {
        __env__: expect.toBeObject(),
        __type__: "pipeline",
        __value__: expect.toBeArray(),
      },
      customInput: "BrickABC Environment",
    },
    "@options": {},
  });

  expect(ContextBlock.contexts[1]).toStrictEqual({
    "@input": {
      customInput: "Closure Environment",
    },
    "@options": {},
  });
});
