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

import { isEmpty, negate, type ObjectIterator } from "lodash";
import pMemoize from "p-memoize";
import { TimeoutError } from "p-timeout";
import { sleep } from "@/utils/timeUtils";

/**
 * A promise that never resolves.
 */
export const foreverPendingPromise = new Promise(() => {});

/**
 * Same as lodash mapValues but supports promises
 */
export async function asyncMapValues<
  InputObject extends Record<string, unknown>,
  OutputValues,
>(mapping: InputObject, fn: ObjectIterator<InputObject, OutputValues>) {
  const entries = Object.entries(mapping) as Array<
    [string, InputObject[keyof InputObject]]
  >;
  const resolvedEntries = await Promise.all(
    entries.map(async ([key, value]) =>
      Promise.all([key, fn(value, key, mapping)]),
    ),
  );
  return Object.fromEntries(resolvedEntries) as {
    [K in keyof InputObject]: Awaited<OutputValues>;
  };
}

export async function allSettledValues<T = unknown>(
  promises: Array<Promise<T>>,
): Promise<T[]> {
  const settled = await Promise.allSettled(promises);
  return settled
    .filter(
      (promise): promise is PromiseFulfilledResult<Awaited<T>> =>
        promise.status === "fulfilled",
    )
    .map(({ value }) => value);
}

export async function logPromiseDuration<P>(
  title: string,
  promise: Promise<P>,
): Promise<P> {
  const start = Date.now();
  try {
    return await promise;
  } finally {
    // Prefer `debug` level; `console.time` has `log` level
    console.debug(title, `${Math.round(Date.now() - start)}ms`);
  }
}

/**
 * Ignores calls made with the same arguments while the first call is pending
 * @example
 *   const memFetch = ignoreRepeatedCalls(fetch)
 *   await Promise([memFetch('/time'), memFetch('/time')])
 *   // => both will return the exact same Promise
 *   await memFetch('/time')
 *   // => no concurrent calls at this time, so another request made
 *
 * @see https://github.com/sindresorhus/promise-fun/issues/15
 */
export const memoizeUntilSettled: typeof pMemoize = (
  functionToMemoize,
  options,
) =>
  pMemoize(functionToMemoize, {
    ...options,
    cache: false,
  });

export async function awaitValue<T>(
  valueFactory: () => T,
  {
    waitMillis,
    retryMillis = 50,
    predicate = negate(isEmpty),
  }: {
    waitMillis: number;
    retryMillis?: number;
    predicate?: (value: T) => boolean;
  },
): Promise<T> {
  const start = Date.now();
  let value: T;
  do {
    value = valueFactory();
    if (predicate(value)) {
      return value;
    }

    // eslint-disable-next-line no-await-in-loop -- intentionally blocking the loop
    await sleep(retryMillis);
  } while (Date.now() - start < waitMillis);

  throw new TimeoutError(`Value not found after ${waitMillis} milliseconds`);
}

export async function pollUntilTruthy<T>(
  looper: (...args: unknown[]) => Promise<T> | T,
  { maxWaitMillis = Number.MAX_SAFE_INTEGER, intervalMillis = 100 },
): Promise<T | undefined> {
  const endBy = Date.now() + maxWaitMillis;
  do {
    // eslint-disable-next-line no-await-in-loop -- It's a retry loop
    const result = await looper();
    if (result) {
      return result;
    }

    // eslint-disable-next-line no-await-in-loop -- It's a retry loop
    await sleep(intervalMillis);
  } while (Date.now() < endBy);
}

/**
 * Retry with delay jitter.
 * @param fn the function to execute
 * @param retries the number of times to retry, excluding the initial attempt
 * @param shouldRetry whether to retry on a given error; defaults to always retrying
 * @param maxDelayMillis the maximum delay between retries, in milliseconds
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  {
    retries = 1,
    shouldRetry = () => true,
    maxDelayMillis = 100,
  }: {
    retries?: number;
    shouldRetry?: (error: unknown) => boolean;
    maxDelayMillis?: number;
  },
): Promise<T> {
  for (let attemptCount = 0; attemptCount < retries + 1; attemptCount++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- retry use-case is an exception to the rule https://eslint.org/docs/latest/rules/no-await-in-loop#when-not-to-use-it
      return await fn();
    } catch (error) {
      if (!shouldRetry(error) || attemptCount >= retries - 1) {
        throw error;
      }

      // eslint-disable-next-line no-await-in-loop -- retry use-case is an exception to the rule
      await sleep(Math.random() * maxDelayMillis);
    }
  }

  // Can't reach due to check in catch block, unless retries is 0
  throw new Error("retries must be >= 0");
}

/**
 * Returns a new object with all the values from the original resolved
 */
export async function resolveObj<T>(
  obj: Record<string, Promise<T>>,
): Promise<Record<string, T>> {
  return Object.fromEntries(
    await Promise.all(Object.entries(obj).map(async ([k, v]) => [k, await v])),
  );
}

export function groupPromisesByStatus<T>(
  results: Array<PromiseSettledResult<T>>,
) {
  const rejected = results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .map(({ reason }) => reason);
  const fulfilled = results
    .filter(
      (result): result is PromiseFulfilledResult<T> =>
        result.status === "fulfilled",
    )
    .map(({ value }) => value);

  return { fulfilled, rejected };
}
