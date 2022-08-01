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

import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { BlockOptions } from "@/core";

beforeEach(() => {
  // Isolate extension state between test
  jest.resetModules();
});

describe("@pixiebrix/state/get", () => {
  test("default to blueprint state", async () => {
    const { GetPageState } = await import("@/blocks/effects/pageState");

    const brick = new GetPageState();
    const logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });
    await brick.transform(unsafeAssumeValidArg({}), { logger } as BlockOptions);
  });
});

describe("@pixiebrix/state/set", () => {
  test("shallow merge", async () => {
    const { SetPageState } = await import("@/blocks/effects/pageState");

    const brick = new SetPageState();
    const logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });

    let result = await brick.transform(
      { data: { foo: 42, bar: 42 } } as any,
      { logger } as BlockOptions
    );
    expect(result).toStrictEqual({ foo: 42, bar: 42 });

    result = await brick.transform(
      { data: { foo: 1 }, mergeStrategy: "shallow" } as any,
      { logger } as BlockOptions
    );
    expect(result).toStrictEqual({ foo: 1, bar: 42 });
  });

  test("deep merge does not append array elements", async () => {
    const { SetPageState } = await import("@/blocks/effects/pageState");

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
      { data: original } as any,
      { logger } as BlockOptions
    );
    expect(result).toStrictEqual(original);

    result = await brick.transform(
      {
        data: {
          primitiveArray: [1],
          primitive: 1,
          obj: { b: 1 },
          objectArray: [{ b: 1 }, { a: 2 }],
        },
        mergeStrategy: "deep",
      } as any,
      { logger } as BlockOptions
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
});

describe("set and get", () => {
  test("default to blueprint state", async () => {
    const { GetPageState, SetPageState } = await import(
      "@/blocks/effects/pageState"
    );

    const setState = new SetPageState();
    const getState = new GetPageState();
    const logger = new ConsoleLogger({
      extensionId: uuidv4(),
      blueprintId: validateRegistryId("test/123"),
    });

    await setState.transform(
      { data: { foo: 42 } } as any,
      { logger } as BlockOptions
    );
    let result = await getState.transform(unsafeAssumeValidArg({}), {
      logger,
    } as BlockOptions);

    expect(result).toStrictEqual({ foo: 42 });

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: "extension" }),
      { logger } as BlockOptions
    );
    expect(result).toStrictEqual({});

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: "shared" }),
      { logger } as BlockOptions
    );
    expect(result).toStrictEqual({});
  });

  test("default to shared if not part of blueprint", async () => {
    const { GetPageState, SetPageState } = await import(
      "@/blocks/effects/pageState"
    );

    const setState = new SetPageState();
    const getState = new GetPageState();
    const logger = new ConsoleLogger({
      extensionId: uuidv4(),
    });

    await setState.transform(
      { data: { foo: 42 } } as any,
      { logger } as BlockOptions
    );
    let result = await getState.transform(unsafeAssumeValidArg({}), {
      logger,
    } as BlockOptions);

    expect(result).toStrictEqual({ foo: 42 });

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: "extension" }),
      { logger } as BlockOptions
    );
    expect(result).toStrictEqual({});

    result = await getState.transform(
      unsafeAssumeValidArg({ namespace: "shared" }),
      { logger } as BlockOptions
    );
    expect(result).toStrictEqual({ foo: 42 });
  });
});
