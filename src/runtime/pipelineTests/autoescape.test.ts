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

import brickRegistry from "@/bricks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import { echoBrick, simpleInput } from "./pipelineTestHelpers";
import { type ApiVersion } from "@/types/runtimeTypes";
import { toExpression } from "@/utils/expressionUtils";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick]);
});

describe.each([["v1"], ["v2"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("autoescape template expressions", async () => {
    const pipeline = [
      {
        id: echoBrick.id,
        config: {
          message: "{{ @input.foo }}",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      simpleInput({ foo: "a & b" }),
      reduceOptionsFactory(apiVersion),
    );
    expect(result).toStrictEqual({ message: "a &amp; b" });
  });
});

describe.each([["v3"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("do not autoescape template expressions", async () => {
    const pipeline = [
      {
        id: echoBrick.id,
        config: {
          message: toExpression("nunjucks", "{{ @input.foo }}"),
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      simpleInput({ foo: "a & b" }),
      reduceOptionsFactory(apiVersion),
    );
    expect(result).toStrictEqual({ message: "a & b" });
  });
});
