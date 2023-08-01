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

import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { type BrickOptions } from "@/types/runtimeTypes";
import { makeTemplateExpression } from "@/runtime/expressionCreators";

beforeEach(() => {
  // Isolate extension state between test
  jest.resetModules();
});

describe("@pixiebrix/state/get", () => {
  test("default to blueprint state", async () => {
    const { GetPageState } = await import("@/bricks/effects/pageState");

    const brick = new GetPageState();
    const logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });
    await brick.transform(unsafeAssumeValidArg({}), { logger } as BrickOptions);
  });

  test("is page state aware", async () => {
    const { GetPageState } = await import("@/bricks/effects/pageState");
    const brick = new GetPageState();
    await expect(brick.isPageStateAware()).resolves.toBe(true);
  });
});

describe("@pixiebrix/state/set", () => {
  test("shallow merge", async () => {
    const { SetPageState } = await import("@/bricks/effects/pageState");

    const brick = new SetPageState();
    const logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });

    let result = await brick.transform(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      { data: { foo: 42, bar: 42 } } as any,
      { logger } as BrickOptions
    );
    expect(result).toStrictEqual({ foo: 42, bar: 42 });

    result = await brick.transform(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      { data: { foo: 1 }, mergeStrategy: "shallow" } as any,
      { logger } as BrickOptions
    );
    expect(result).toStrictEqual({ foo: 1, bar: 42 });
  });

  test("deep merge does not append array elements", async () => {
    const { SetPageState } = await import("@/bricks/effects/pageState");

    const brick = new SetPageState();
    const logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });

    const original = {
      primitiveArray: [42],
      primitive: 42,
      obj: { a: 42 },
      objectArray: [{ a: 42 }],
    };

    let result = await brick.transform(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      { data: original } as any,
      { logger } as BrickOptions
    );
    expect(result).toStrictEqual(original);

    result = await brick.transform(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      {
        data: {
          primitiveArray: [1],
          primitive: 1,
          obj: { b: 1 },
          objectArray: [{ b: 1 }, { a: 2 }],
        },
        mergeStrategy: "deep",
      } as any,
      { logger } as BrickOptions
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
    const { SetPageState } = await import("@/bricks/effects/pageState");
    const brick = new SetPageState();

    await expect(
      brick.getModVariableSchema({
        id: brick.id,
        config: {
          data: {
            foo: makeTemplateExpression("nunjucks", "{{ @hello }}"),
          },
        },
      })
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
    const { SetPageState } = await import("@/bricks/effects/pageState");
    const brick = new SetPageState();

    await expect(
      brick.getModVariableSchema({
        id: brick.id,
        config: {
          namespace: "extension",
          data: {
            foo: makeTemplateExpression("nunjucks", "{{ @hello }}"),
          },
        },
      })
    ).resolves.toBeUndefined();
  });
});

describe("set and get", () => {
  test("default to blueprint state", async () => {
    const { GetPageState, SetPageState } = await import(
      "@/bricks/effects/pageState"
    );

    const setState = new SetPageState();
    const getState = new GetPageState();
    const logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });

    await setState.transform(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      { data: { foo: 42 } } as any,
      { logger } as BrickOptions
    );
    let result = await getState.transform(unsafeAssumeValidArg({}), {
      logger,
    } as BrickOptions);

    expect(result).toStrictEqual({ foo: 42 });

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: "extension" }),
      { logger } as BrickOptions
    );
    expect(result).toStrictEqual({});

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: "shared" }),
      { logger } as BrickOptions
    );
    expect(result).toStrictEqual({});
  });

  test("default to shared if not part of blueprint", async () => {
    const { GetPageState, SetPageState } = await import(
      "@/bricks/effects/pageState"
    );

    const setState = new SetPageState();
    const getState = new GetPageState();
    const logger = new ConsoleLogger({
      extensionId: uuidv4(),
    });

    await setState.transform(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      { data: { foo: 42 } } as any,
      { logger } as BrickOptions
    );
    let result = await getState.transform(unsafeAssumeValidArg({}), {
      logger,
    } as BrickOptions);

    expect(result).toStrictEqual({ foo: 42 });

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: "extension" }),
      { logger } as BrickOptions
    );
    expect(result).toStrictEqual({});

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: "shared" }),
      { logger } as BrickOptions
    );
    expect(result).toStrictEqual({ foo: 42 });
  });

  test("is page state aware", async () => {
    const { SetPageState } = await import("@/bricks/effects/pageState");
    const brick = new SetPageState();
    await expect(brick.isPageStateAware()).resolves.toBe(true);
  });
});
