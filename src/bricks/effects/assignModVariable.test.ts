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

import ConsoleLogger from "@/utils/ConsoleLogger";
import { validateRegistryId } from "@/types/helpers";
import AssignModVariable from "@/bricks/effects/assignModVariable";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import {
  getState,
  MergeStrategies,
  setState,
  StateNamespaces,
} from "@/platform/state/stateController";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { validateBrickInputOutput } from "@/validators/schemaValidator";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";

const extensionId = autoUUIDSequence();
const blueprintId = validateRegistryId("test/123");

const brick = new AssignModVariable();

const logger = new ConsoleLogger({
  extensionId,
  blueprintId,
});

const brickOptions = brickOptionsFactory({ logger });

beforeEach(() => {
  setState({
    namespace: StateNamespaces.MOD,
    blueprintId,
    extensionId,
    mergeStrategy: MergeStrategies.REPLACE,
    data: {},
  });
});

describe("@pixiebrix/state/assign", () => {
  test("replaces value", async () => {
    await brick.run(
      unsafeAssumeValidArg({ variableName: "foo", value: { foo: 42 } }),
      brickOptions,
    );

    await brick.run(
      unsafeAssumeValidArg({ variableName: "foo", value: { bar: 42 } }),
      brickOptions,
    );

    expect(
      getState({ namespace: StateNamespaces.MOD, blueprintId, extensionId }),
    ).toEqual({ foo: { bar: 42 } });
  });

  test("null is valid input", async () => {
    await expect(
      validateBrickInputOutput(brick.inputSchema, {
        variableName: "foo",
        value: null,
      }),
    ).resolves.toStrictEqual({
      errors: [],
      valid: true,
    });
  });

  test("sets null on the state", async () => {
    // Null is valid. Currently, to pass it in the interface you have to use JQ or a brick output because you can't
    // create null with the input toggle interface.

    await brick.run(
      unsafeAssumeValidArg({ variableName: "foo", value: 42 }),
      brickOptions,
    );
    await brick.run(
      unsafeAssumeValidArg({ variableName: "foo", value: null }),
      brickOptions,
    );

    expect(
      getState({ namespace: StateNamespaces.MOD, blueprintId, extensionId }),
    ).toEqual({ foo: null });
  });

  test("only sets variable", async () => {
    await brick.run(
      unsafeAssumeValidArg({ variableName: "foo", value: 42 }),
      brickOptions,
    );

    await brick.run(
      unsafeAssumeValidArg({ variableName: "bar", value: 0 }),
      brickOptions,
    );

    expect(
      getState({ namespace: StateNamespaces.MOD, blueprintId, extensionId }),
    ).toEqual({ foo: 42, bar: 0 });
  });

  test("it returns mod variables", async () => {
    await expect(
      brick.getModVariableSchema({
        id: brick.id,
        config: { variableName: "foo" },
      }),
    ).resolves.toEqual({
      type: "object",
      additionalProperties: false,
      properties: {
        foo: true,
      },
      required: ["foo"],
    });
  });
});
