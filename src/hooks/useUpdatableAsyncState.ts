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

import { type SetStateAction, useCallback, useState } from "react";
import { type Promisable } from "type-fest";
import useAsyncEffect from "use-async-effect";

type Callbacks<S> = {
  get: () => Promise<S>;
  set: (value: S) => Promisable<void>;
};

export default function useUpdatableAsyncState<S = undefined>({
  get,
  set,
}: Callbacks<S>): // TODO: Accept dependencies
[S | undefined, (value: SetStateAction<S | undefined>) => Promise<void>] {
  const [value, setValue] = useState<S>();

  useAsyncEffect(
    async (isMounted) => {
      const value = await get();
      if (isMounted()) {
        setValue(value);
      }
    },
    [setValue]
  );

  const update = useCallback(
    async (newValue: S) => {
      await set(newValue);
      setValue(newValue);
    },
    [setValue, set]
  );

  return [value, update];
}
