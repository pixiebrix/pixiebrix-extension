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

import {
  allSettled,
  groupPromisesByStatus,
  memoizeUntilSettled,
  retryWithJitter,
  asyncMapValues,
  pollUntilTruthy,
} from "./promiseUtils";
import { PromiseCancelled } from "../errors/genericErrors";
import pDefer from "p-defer";

// From https://github.com/sindresorhus/p-memoize/blob/52fe6052ff2287f528c954c4c67fc5a61ff21360/test.ts#LL198
test("memoizeUntilSettled", async () => {
  let index = 0;

  const memoized = memoizeUntilSettled(async () => index++);

  await expect(memoized()).resolves.toBe(0);
  await expect(memoized()).resolves.toBe(1);
  await expect(memoized()).resolves.toBe(2);
  await expect(Promise.all([memoized(), memoized()])).resolves.toStrictEqual([
    3, 3,
  ]);
});

test("groupPromisesByStatus", async () => {
  const promises = [
    Promise.resolve(1),
    Promise.reject(new Error("something happened")),
    Promise.resolve(2),
  ];

  const { fulfilled, rejected } = groupPromisesByStatus(
    // eslint-disable-next-line no-restricted-syntax -- Testing
    await Promise.allSettled(promises),
  );

  expect(fulfilled).toStrictEqual([1, 2]);
  expect(rejected).toHaveLength(1);
  expect(rejected[0]).toBeInstanceOf(Error);
  expect((rejected[0] as Error).message).toBe("something happened");
});

describe("allSettled", () => {
  it("returns the values of fulfilled promises", async () => {
    const promises = [Promise.resolve(1), Promise.resolve(2)];
    // @ts-expect-error TS must error here because the callbacks are missing.
    // This expectation is part of the test. DO NOT REMOVE
    const result = await allSettled(promises, {});
    expect(result).toStrictEqual({ fulfilled: [1, 2], rejected: [] });
  });

  it("returns the errors of rejected promises", async () => {
    const promises = [
      Promise.reject(new Error("error 1")),
      Promise.reject(new Error("error 2")),
    ];
    const result = await allSettled(promises, {
      catch: "ignore",
    });
    expect(result).toStrictEqual({
      fulfilled: [],
      rejected: [new Error("error 1"), new Error("error 2")],
    });
  });

  it("calls the onError callback for all rejected promises", async () => {
    const promises = [
      Promise.reject(new Error("error 1")),
      Promise.reject(new Error("error 2")),
    ];
    const onError = jest.fn();
    await allSettled(promises, {
      catch: onError,
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith([
      new Error("error 1"),
      new Error("error 2"),
    ]);
  });

  it("doesn't call onError if there are no rejections", async () => {
    const promises = [Promise.resolve(1), Promise.resolve(2)];
    const onError = jest.fn();
    await allSettled(promises, {
      catch: onError,
    });
    expect(onError).not.toHaveBeenCalled();
  });
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

  it("executes a function successfully and returns the result", async () => {
    const fn = jest.fn(async () => 1);
    const result = await retryWithJitter(fn, {
      retries: 3,
    });
    expect(result).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a function that fails once and returns the result", async () => {
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

  it("throws an error if the function fails more than the max retries", async () => {
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

  it("retries on the specified error, and throws on all other errors", async () => {
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
  it("maps values", async () => {
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

describe("pollUntilTruthy", () => {
  it("returns truthy value", async () => {
    const generator = jest.fn().mockResolvedValue(true);
    await expect(pollUntilTruthy(generator)).resolves.toBe(true);
  });

  it("returns undefined for falsy value", async () => {
    const generator = jest.fn().mockResolvedValue(false);
    await expect(
      pollUntilTruthy(generator, { maxWaitMillis: 0, intervalMillis: 1 }),
    ).resolves.toBeUndefined();
    // Still calls even if maxWaitMillis is 0
    expect(generator).toHaveBeenCalledOnce();
  });

  it("doesn't call generator if already aborted", async () => {
    const generator = jest.fn().mockResolvedValue(true);
    const controller = new AbortController();
    controller.abort(new PromiseCancelled());

    const pollPromise = pollUntilTruthy(generator, {
      signal: controller.signal,
    });

    await expect(pollPromise).rejects.toThrow(PromiseCancelled);
    expect(generator).not.toHaveBeenCalled();
  });

  it("prefers abort signal", async () => {
    const deferred = pDefer();
    const generator = jest.fn().mockResolvedValue(deferred.promise);
    const controller = new AbortController();

    const pollPromise = pollUntilTruthy(generator, {
      signal: controller.signal,
    });

    controller.abort(new PromiseCancelled());
    deferred.resolve(true);

    expect(generator).toHaveBeenCalledOnce();
    await expect(pollPromise).rejects.toThrow(PromiseCancelled);
  });
});
