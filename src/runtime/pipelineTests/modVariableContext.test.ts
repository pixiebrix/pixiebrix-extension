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

import blockRegistry from "@/bricks/registry";
import {
  contextBrick,
  echoBrick,
  simpleInput,
  testOptions,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { setPageState } from "@/contentScript/pageState";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import {
  makeTemplateExpression,
  makeVariableExpression,
} from "@/runtime/expressionCreators";
import { reducePipeline } from "@/runtime/reducePipeline";
import { contextAsPlainObject } from "@/runtime/extendModVariableContext";
import { type UnknownObject } from "@/types/objectTypes";

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register([echoBrick, contextBrick]);
});

describe("modVariableContext", () => {
  test("use mod variable in variable condition", async () => {
    setPageState({
      namespace: "blueprint",
      data: { run: true },
      mergeStrategy: "replace",
      extensionId: autoUUIDSequence(),
      blueprintId: undefined,
    });

    const pipeline = [
      {
        id: echoBrick.id,
        if: makeVariableExpression("@mod.run"),
        config: {
          message: "Ran block",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: {} },
      testOptions("v3")
    );
    expect(result).toStrictEqual({ message: "Ran block" });
  });

  test("use mod variable in nunjucks condition", async () => {
    setPageState({
      namespace: "blueprint",
      data: { run: true },
      mergeStrategy: "replace",
      extensionId: autoUUIDSequence(),
      blueprintId: undefined,
    });

    const pipeline = [
      {
        id: echoBrick.id,
        if: makeTemplateExpression("nunjucks", "{{ true if @mod.run}}"),
        config: {
          message: "Ran block",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: {} },
      testOptions("v3")
    );
    expect(result).toStrictEqual({ message: "Ran block" });
  });

  test("mod variable appears in context", async () => {
    setPageState({
      namespace: "blueprint",
      data: { name: "Bob" },
      mergeStrategy: "replace",
      extensionId: autoUUIDSequence(),
      blueprintId: undefined,
    });

    const pipeline = [
      {
        id: contextBrick.id,
        config: {},
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: {} },
      testOptions("v3")
    );
    expect(contextAsPlainObject(result as UnknownObject)).toStrictEqual({
      "@input": {},
      "@options": {},
      "@mod": { name: "Bob" },
    });
  });

  test("use mod variable in nunjucks body", async () => {
    setPageState({
      namespace: "blueprint",
      data: { name: "Bob" },
      mergeStrategy: "replace",
      extensionId: autoUUIDSequence(),
      blueprintId: undefined,
    });

    const pipeline = [
      {
        id: echoBrick.id,
        config: {
          message: makeTemplateExpression("nunjucks", "Hello, {{ @mod.name }}"),
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: {} },
      testOptions("v3")
    );
    expect(result).toStrictEqual({ message: "Hello, Bob" });
  });

  test("use mod variable in variable body", async () => {
    setPageState({
      namespace: "blueprint",
      data: { name: "Bob" },
      mergeStrategy: "replace",
      extensionId: autoUUIDSequence(),
      blueprintId: undefined,
    });

    const pipeline = [
      {
        id: echoBrick.id,
        config: {
          message: makeVariableExpression("@mod.name"),
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: {} },
      testOptions("v3")
    );
    expect(result).toStrictEqual({ message: "Bob" });
  });
});
