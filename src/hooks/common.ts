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

import { useState } from "react";
import useAsyncEffect from "use-async-effect";

type StateFactory<T> = Promise<T> | (() => Promise<T>);

export function useAsyncState<T>(
  promiseFactory: StateFactory<T>,
  dependencies: unknown[] = []
): [T | undefined, boolean, unknown] {
  const [result, setResult] = useState(undefined);
  const [isPending, setPending] = useState(true);
  const [error, setError] = useState(undefined);

  useAsyncEffect(async (isMounted) => {
    setPending(true);
    setError(undefined);
    try {
      const promiseResult = await (typeof promiseFactory === "function"
        ? promiseFactory()
        : promiseFactory);
      if (!isMounted()) return;
      setResult(promiseResult);
    } catch (ex) {
      if (isMounted()) {
        setResult(undefined);
        setError(ex ?? "Error calculating data");
      }
    } finally {
      if (isMounted()) {
        setPending(false);
      }
    }
  }, dependencies);

  return [result, isPending, error];
}
