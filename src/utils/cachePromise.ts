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

import { isEqual } from "lodash";

type SharedPromise<T = unknown> = {
  dependencies: unknown[];
  promise: Promise<T>;
};

const promises: SharedPromise[] = [];

// TODO: use https://github.com/sindresorhus/p-memoize#caching-strategy because we will want to use
//  the library in some other places too. We'll need to define a custom key method

async function cachePromise<T = unknown>(
  dependencies: unknown[],
  defaultFactory: () => Promise<T>
): Promise<T> {
  const match = promises.find((x) => isEqual(x.dependencies, dependencies));

  if (match) {
    return match.promise as Promise<T>;
  }

  const promise = defaultFactory();
  promises.push({ dependencies, promise });

  try {
    return await promise;
  } catch {
    // Remove failed promises so they can be retried
    const index = promises.findIndex(
      (x) => !isEqual(x.dependencies, dependencies)
    );
    if (index >= 0) {
      promises.splice(index, 1);
    }
  }
}

type PromiseFactory<T = unknown> = (...args: unknown[]) => Promise<T>;

export function cachePromiseMethod<T extends PromiseFactory>(
  keys: unknown[],
  promiseFactory: T
): T {
  return (async (...args: unknown[]) =>
    cachePromise([...keys, ...args], async () => promiseFactory(...args))) as T;
}

export default cachePromise;
