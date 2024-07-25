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
import {
  contextBrick,
  echoBrick,
  simpleInput,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { setState } from "@/platform/state/stateController";
import { reducePipeline } from "@/runtime/reducePipeline";
import { contextAsPlainObject } from "@/runtime/extendModVariableContext";
import { toExpression } from "@/utils/expressionUtils";
import { reduceOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { MergeStrategies, StateNamespaces } from "@/platform/state/stateTypes";

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, contextBrick]);
});

describe("modVariableContext", () => {
  test("use mod variable in variable condition", async () => {
    const options = reduceOptionsFactory("v3");

    setState({
      namespace: StateNamespaces.MOD,
      data: { run: true },
      mergeStrategy: MergeStrategies.REPLACE,
      modComponentRef: options.modComponentRef,
    });

    const pipeline = [
      {
        id: echoBrick.id,
        if: toExpression("var", "@mod.run"),
        config: {
          message: "Ran brick",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: {} },
      options,
    );
    expect(result).toStrictEqual({ message: "Ran brick" });
  });

  test("use mod variable in nunjucks condition", async () => {
    const options = reduceOptionsFactory("v3");

    setState({
      namespace: StateNamespaces.MOD,
      data: { run: true },
      mergeStrategy: MergeStrategies.REPLACE,
      modComponentRef: options.modComponentRef,
    });

    const pipeline = [
      {
        id: echoBrick.id,
        if: toExpression("nunjucks", "{{ true if @mod.run}}"),
        config: {
          message: "Ran block",
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: {} },
      options,
    );
    expect(result).toStrictEqual({ message: "Ran block" });
  });

  test("mod variable appears in context", async () => {
    const options = reduceOptionsFactory("v3");

    setState({
      namespace: StateNamespaces.MOD,
      data: { name: "Bob" },
      mergeStrategy: MergeStrategies.REPLACE,
      modComponentRef: options.modComponentRef,
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
      options,
    );
    expect(contextAsPlainObject(result as UnknownObject)).toStrictEqual({
      "@input": {},
      "@options": {},
      "@mod": { name: "Bob" },
    });
  });

  test("use mod variable in nunjucks body", async () => {
    const options = reduceOptionsFactory("v3");

    setState({
      namespace: StateNamespaces.MOD,
      data: { name: "Bob" },
      mergeStrategy: MergeStrategies.REPLACE,
      modComponentRef: options.modComponentRef,
    });

    const pipeline = [
      {
        id: echoBrick.id,
        config: {
          message: toExpression("nunjucks", "Hello, {{ @mod.name }}"),
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: {} },
      options,
    );
    expect(result).toStrictEqual({ message: "Hello, Bob" });
  });

  test("use mod variable in variable body", async () => {
    const options = reduceOptionsFactory("v3");

    setState({
      namespace: StateNamespaces.MOD,
      data: { name: "Bob" },
      mergeStrategy: MergeStrategies.REPLACE,
      modComponentRef: options.modComponentRef,
    });

    const pipeline = [
      {
        id: echoBrick.id,
        config: {
          message: toExpression("var", "@mod.name"),
        },
      },
    ];
    const result = await reducePipeline(
      pipeline,
      { ...simpleInput({}), optionsArgs: {} },
      options,
    );
    expect(result).toStrictEqual({ message: "Bob" });
  });
});
