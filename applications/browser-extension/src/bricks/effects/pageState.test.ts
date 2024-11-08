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

import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";
import { toExpression } from "../../utils/expressionUtils";
import { GetPageState, SetPageState } from "./pageState";
import { TEST_resetStateController } from "@/contentScript/stateController/stateController";
import {
  MergeStrategies,
  StateNamespaces,
} from "../../platform/state/stateTypes";

beforeEach(async () => {
  await TEST_resetStateController();
});

describe("@pixiebrix/state/get", () => {
  test("default to mod namespace", async () => {
    const brick = new GetPageState();
    await brick.transform(unsafeAssumeValidArg({}), brickOptionsFactory());
  });

  test("is page state aware", async () => {
    const brick = new GetPageState();
    await expect(brick.isPageStateAware()).resolves.toBe(true);
  });
});

describe("@pixiebrix/state/set", () => {
  test("shallow merge", async () => {
    const brick = new SetPageState();
    const brickOptions = brickOptionsFactory();

    let result = await brick.transform(
      { data: { foo: 42, bar: 42 } } as any,
      brickOptions,
    );
    expect(result).toStrictEqual({ foo: 42, bar: 42 });

    result = await brick.transform(
      unsafeAssumeValidArg({
        data: { foo: 1 },
        mergeStrategy: MergeStrategies.SHALLOW,
      }),
      brickOptions,
    );
    expect(result).toStrictEqual({ foo: 1, bar: 42 });
  });

  test("deep merge does not append array elements", async () => {
    const { SetPageState } = await import("./pageState");

    const brick = new SetPageState();
    const brickOptions = brickOptionsFactory();

    const original = {
      primitiveArray: [42],
      primitive: 42,
      obj: { a: 42 },
      objectArray: [{ a: 42 }],
    };

    let result = await brick.transform({ data: original } as any, brickOptions);
    expect(result).toStrictEqual(original);

    result = await brick.transform(
      unsafeAssumeValidArg({
        data: {
          primitiveArray: [1],
          primitive: 1,
          obj: { b: 1 },
          objectArray: [{ b: 1 }, { a: 2 }],
        },
        mergeStrategy: MergeStrategies.DEEP,
      }),
      brickOptions,
    );

    // NOTE: lodash's `merge` behavior is different from deepmerge from Python. Lodash will zip the list items together
    // but will not append items to an array
    expect(result).toStrictEqual({
      primitiveArray: [1],
      primitive: 1,
      obj: { a: 42, b: 1 },
      objectArray: [{ a: 42, b: 1 }, { a: 2 }],
    });
  });

  it("returns mod variables", async () => {
    const { SetPageState } = await import("./pageState");
    const brick = new SetPageState();

    await expect(
      brick.getModVariableSchema({
        id: brick.id,
        config: {
          data: {
            foo: toExpression("nunjucks", "{{ @hello }}"),
          },
        },
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

  it("ignores private variables", async () => {
    const { SetPageState } = await import("./pageState");
    const brick = new SetPageState();

    await expect(
      brick.getModVariableSchema({
        id: brick.id,
        config: {
          namespace: StateNamespaces.PRIVATE,
          data: {
            foo: toExpression("nunjucks", "{{ @hello }}"),
          },
        },
      }),
    ).resolves.toBeUndefined();
  });
});

describe("set and get", () => {
  test("default to blueprint state", async () => {
    const setState = new SetPageState();
    const getState = new GetPageState();
    const brickOptions = brickOptionsFactory();

    await setState.transform(
      unsafeAssumeValidArg({ data: { foo: 42 } }),
      brickOptions,
    );
    let result = await getState.transform(
      unsafeAssumeValidArg({}),
      brickOptions,
    );

    expect(result).toStrictEqual({ foo: 42 });

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: StateNamespaces.PRIVATE }),
      brickOptions,
    );
    expect(result).toStrictEqual({});

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: StateNamespaces.PUBLIC }),
      brickOptions,
    );
    expect(result).toStrictEqual({});
  });

  test("is page state aware", async () => {
    const brick = new SetPageState();
    await expect(brick.isPageStateAware()).resolves.toBe(true);
  });
});
