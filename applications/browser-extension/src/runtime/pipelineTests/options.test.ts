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

import { type ApiVersion } from "../../types/runtimeTypes";
import brickRegistry from "@/bricks/registry";
import { reducePipeline } from "../reducePipeline";
import { contextBrick, echoBrick, simpleInput } from "./testHelpers";
import { extraEmptyModStateContext } from "../extendModVariableContext";
import { reduceOptionsFactory } from "../../testUtils/factories/runtimeFactories";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, contextBrick]);
});

describe.each([["v1"], ["v2"]])("apiVersion: %s", (apiVersion: ApiVersion) => {
  test("implicit use @options", async () => {
    const pipeline = [
      {
        id: echoBrick.id,
        config: {
          message: "@options.message",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: { message: "Test message" } },
      reduceOptionsFactory(apiVersion),
    );
    expect(result).toStrictEqual({ message: "Test message" });
  });
});

describe.each([["v1"], ["v2"], ["v3"]])(
  "apiVersion: %s",
  (apiVersion: ApiVersion) => {
    test("pass @options to brick", async () => {
      const pipeline = [
        {
          id: contextBrick.id,
          config: {},
        },
      ];
      const result = await reducePipeline(
        pipeline,
        { ...simpleInput({}), optionsArgs: { message: "Test message" } },
        reduceOptionsFactory(apiVersion),
      );

      expect(result).toStrictEqual({
        "@input": {},
        "@options": { message: "Test message" },
        ...extraEmptyModStateContext(apiVersion),
      });
    });
  },
);
