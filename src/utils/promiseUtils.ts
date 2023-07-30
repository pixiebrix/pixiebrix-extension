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

import { isEmpty, negate, ObjectIterator, unary, zip } from "lodash";
import pMemoize from "p-memoize";
import { TimeoutError } from "p-timeout";

import { sleep } from "@/utils/timeUtils";

export const foreverPendingPromise = new Promise(() => {});

/**
 * Same as lodash mapValues but supports promises
 */
export async function asyncMapValues<T, TResult>(
  mapping: Record<string, T[keyof T]>,
  fn: ObjectIterator<Record<string, T[keyof T]>, Promise<TResult>>
): Promise<{ [K in keyof T]: TResult }> {
  const entries = Object.entries(mapping);
  const values = await Promise.all(
    entries.map(async ([key, value]) => fn(value, key, mapping))
  );
  return Object.fromEntries(
    zip(entries, values).map(([[key], value]) => [key, value])
  ) as any;
}

export async function allSettledValues<T = unknown>(
  promises: Array<Promise<T>>
): Promise<T[]> {
  const settled = await Promise.allSettled(promises);
  return settled
    .filter(
      (promise): promise is PromiseFulfilledResult<Awaited<T>> =>
        promise.status === "fulfilled"
    )
    .map(({ value }) => value);
}

export async function logPromiseDuration<P>(
  title: string,
  promise: Promise<P>
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
  options
) =>
  pMemoize(functionToMemoize, {
    ...options,
    cache: false,
  });

/** Loop an iterable with the ability to place `await` in the loop itself */
export async function asyncForEach<Item>(
  iterable: Iterable<Item>,
  iteratee: (item: Item) => Promise<void>
): Promise<void> {
  await Promise.all([...iterable].map(unary(iteratee)));
}

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
  }
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
  { maxWaitMillis = Number.MAX_SAFE_INTEGER, intervalMillis = 100 }
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
 * Returns a new object with all the values from the original resolved
 */
export async function resolveObj<T>(
  obj: Record<string, Promise<T>>
): Promise<Record<string, T>> {
  return Object.fromEntries(
    await Promise.all(Object.entries(obj).map(async ([k, v]) => [k, await v]))
  );
}
