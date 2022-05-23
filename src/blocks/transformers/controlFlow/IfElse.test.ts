/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import blockRegistry from "@/blocks/registry";
import {
  simpleInput,
  teapotBlock,
  testOptions,
  throwBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import IfElse from "@/blocks/transformers/controlFlow/IfElse";
import { reducePipeline } from "@/runtime/reducePipeline";
import * as logging from "@/background/messenger/api";

(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

const ifElseBlock = new IfElse();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(teapotBlock, throwBlock, ifElseBlock);
});

describe("IfElse", () => {
  test("if branch", async () => {
    const pipeline = {
      id: ifElseBlock.id,
      config: {
        condition: true,
        if: {
          __type__: "pipeline",
          __value__: [{ id: teapotBlock.id }],
        },
        else: {
          __type__: "pipeline",
          // Throw to make it more obvious if wrong branch taken
          __value__: [{ id: throwBlock.id }],
        },
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ prop: "I'm a teapot" });
  });

  test("else branch", async () => {
    const pipeline = {
      id: ifElseBlock.id,
      config: {
        condition: false,
        if: {
          __type__: "pipeline",
          // Throw to make it more obvious if wrong branch taken
          __value__: [{ id: throwBlock.id }],
        },
        else: {
          __type__: "pipeline",
          __value__: [{ id: teapotBlock.id }],
        },
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual({ prop: "I'm a teapot" });
  });

  test("else optional", async () => {
    const pipeline = {
      id: ifElseBlock.id,
      config: {
        condition: false,
        if: {
          __type__: "pipeline",
          // Throw to make it more obvious if wrong branch taken
          __value__: [{ id: throwBlock.id }],
        },
      },
    };
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );
    expect(result).toStrictEqual(null);
  });
});
