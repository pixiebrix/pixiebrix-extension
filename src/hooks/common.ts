/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { useCallback, useState } from "react";
import useAsyncEffect from "use-async-effect";

type StateFactory<T> = Promise<T> | (() => Promise<T>);

export type AsyncState<T> = [
  T | undefined,
  boolean,
  unknown,
  () => Promise<void>
];

export function useAsyncState<T>(
  promiseFactory: StateFactory<T>,
  dependencies: unknown[] = []
): AsyncState<T> {
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const recalculate = useCallback(async () => {
    try {
      const promiseResult = await (typeof promiseFactory === "function"
        ? promiseFactory()
        : promiseFactory);
      setData(promiseResult);
    } catch (error_) {
      // eslint-disable-next-line unicorn/no-useless-undefined -- TypeScript requires argument
      setData(undefined);
      setError(error_ ?? "Error producing data");
    } finally {
      setLoading(false);
    }
  }, [setData, setLoading, setError, promiseFactory]);

  useAsyncEffect(async (isMounted) => {
    setLoading(true);
    // eslint-disable-next-line unicorn/no-useless-undefined -- TypeScript requires argument
    setError(undefined);
    try {
      const promiseResult = await (typeof promiseFactory === "function"
        ? promiseFactory()
        : promiseFactory);
      if (!isMounted()) return;
      setData(promiseResult);
    } catch (error_) {
      if (isMounted()) {
        // eslint-disable-next-line unicorn/no-useless-undefined -- TypeScript requires argument
        setData(undefined);
        setError(error_ ?? "Error producing data");
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, dependencies);

  return [data, isLoading, error, recalculate];
}
