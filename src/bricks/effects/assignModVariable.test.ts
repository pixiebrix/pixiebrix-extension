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

import AssignModVariable from "@/bricks/effects/assignModVariable";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { validateBrickInputOutput } from "@/validators/schemaValidator";
import {
  brickOptionsFactory,
  runMetadataFactory,
} from "@/testUtils/factories/runtimeFactories";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import { MergeStrategies, StateNamespaces } from "@/platform/state/stateTypes";
import { getPlatform } from "@/platform/platformContext";

const brick = new AssignModVariable();

const modComponentRef = modComponentRefFactory();

const brickOptions = brickOptionsFactory({
  meta: runMetadataFactory({ modComponentRef }),
});

beforeEach(() => {
  getPlatform().state.setState({
    namespace: StateNamespaces.MOD,
    modComponentRef,
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

    await expect(
      getPlatform().state.getState({
        namespace: StateNamespaces.MOD,
        modComponentRef,
      }),
    ).resolves.toEqual({ foo: { bar: 42 } });
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

    await expect(
      getPlatform().state.getState({
        namespace: StateNamespaces.MOD,
        modComponentRef,
      }),
    ).resolves.toEqual({ foo: null });
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

    await expect(
      getPlatform().state.getState({
        namespace: StateNamespaces.MOD,
        modComponentRef,
      }),
    ).resolves.toEqual({ foo: 42, bar: 0 });
  });

  it("returns mod variables", async () => {
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
