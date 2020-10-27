/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useMemo } from "react";
import useAsyncEffect from "use-async-effect";
import isPromise from "is-promise";

type StateFactory<T> = Promise<T> | (() => Promise<T>);

export function useAsyncState<T>(
  promiseFactory: StateFactory<T>
): [T | undefined, boolean] {
  const promise = useMemo(() => {
    const maybePromise =
      typeof promiseFactory === "function" ? promiseFactory() : promiseFactory;
    if (!isPromise(maybePromise)) {
      throw new Error("useAsyncState expects a promise of promise factory");
    }
    return maybePromise;
  }, [promiseFactory]);
  const [result, setResult] = useState(undefined);
  const [isPending, setPending] = useState(true);
  useAsyncEffect(async (isMounted) => {
    setPending(true);
    try {
      const promiseResult = await promise;
      if (!isMounted()) return;
      setResult(promiseResult);
    } finally {
      if (isMounted()) {
        setPending(false);
      }
    }
  }, []);
  return [result, isPending];
}
