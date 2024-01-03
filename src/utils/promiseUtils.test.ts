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

import {
  groupPromisesByStatus,
  memoizeUntilSettled,
  retryWithJitter,
  asyncMapValues,
} from "@/utils/promiseUtils";

// From https://github.com/sindresorhus/p-memoize/blob/52fe6052ff2287f528c954c4c67fc5a61ff21360/test.ts#LL198
test("memoizeUntilSettled", async () => {
  let index = 0;

  const memoized = memoizeUntilSettled(async () => index++);

  expect(await memoized()).toBe(0);
  expect(await memoized()).toBe(1);
  expect(await memoized()).toBe(2);
  expect(await Promise.all([memoized(), memoized()])).toStrictEqual([3, 3]);
});

test("groupPromisesByStatus", async () => {
  const promises = [
    Promise.resolve(1),
    Promise.reject(new Error("something happened")),
    Promise.resolve(2),
  ];

  const { fulfilled, rejected } = groupPromisesByStatus(
    await Promise.allSettled(promises),
  );

  expect(fulfilled).toStrictEqual([1, 2]);
  expect(rejected).toHaveLength(1);
  expect(rejected[0]).toBeInstanceOf(Error);
  expect(rejected[0].message).toBe("something happened");
});

describe("retryWithJitter", () => {
  test("retry count excludes initial attempt", async () => {
    const fn = jest.fn(async () => 1);
    const result = retryWithJitter(fn, {
      retries: 0,
    });
    await expect(result).resolves.toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("no retries", async () => {
    const fn = jest.fn(async () => {
      throw new Error("error");
    });
    const result = retryWithJitter(fn, {
      retries: 0,
    });
    await expect(result).rejects.toThrow("error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("it executes a function successfully and returns the result", async () => {
    const fn = jest.fn(async () => 1);
    const result = await retryWithJitter(fn, {
      retries: 3,
    });
    expect(result).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("it retries a function that fails once and returns the result", async () => {
    const fn = jest.fn(async () => {
      if (fn.mock.calls.length === 1) {
        throw new Error("error");
      }

      return 1;
    });
    const result = await retryWithJitter(fn, {
      retries: 3,
    });
    expect(result).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("it throws an error if the function fails more than the max retries", async () => {
    const fn = jest.fn(async () => {
      throw new Error("error");
    });

    await expect(
      retryWithJitter(fn, {
        retries: 3,
      }),
    ).rejects.toThrow("error");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("it retries on the specified error, and throws on all other errors", async () => {
    const fn = jest.fn(async () => {
      if (fn.mock.calls.length === 1) {
        throw new Error("a specified error");
      }

      throw new Error("different non-specified error");
    });

    await expect(
      retryWithJitter(fn, {
        retries: 3,
        shouldRetry: (error) =>
          (error as Error).message.includes("a specified error"),
      }),
    ).rejects.toThrow("different non-specified error");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("asyncMapValues", () => {
  test("it maps values", async () => {
    const result = await asyncMapValues(
      {
        a: 1,
        b: 2,
      },
      async (value): Promise<number> => value * 2,
    );

    expect(result).toStrictEqual({
      a: 2,
      b: 4,
    });
  });
});
