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

import blockRegistry from "@/blocks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import { echoBlock, simpleInput, testOptions } from "./pipelineTestHelpers";

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/logging";
import { ApiVersion } from "@/core";
jest.mock("@/background/trace");
(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock);
});

describe.each([["v1"], ["v2"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("autoescape template expressions", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        config: {
          message: "{{ @input.foo }}",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      simpleInput({ foo: "a & b" }),
      testOptions(apiVersion)
    );
    expect(result).toStrictEqual({ message: "a &amp; b" });
  });
});

describe.each([["v3"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("do not autoescape template expressions", async () => {
    const pipeline = [
      {
        id: echoBlock.id,
        config: {
          message: {
            __type__: "nunjucks",
            __value__: "{{ @input.foo }}",
          },
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      simpleInput({ foo: "a & b" }),
      testOptions(apiVersion)
    );
    expect(result).toStrictEqual({ message: "a & b" });
  });
});
