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

import { ManualStorageKey, readStorage, setStorage } from "@/chrome";
import { boolean } from "@/utils";
import { useCallback, useState } from "react";
import { useAsyncEffect } from "use-async-effect";

export const DNT_STORAGE_KEY = "DNT" as ManualStorageKey;

export async function setDNT(enable: boolean): Promise<void> {
  await setStorage(DNT_STORAGE_KEY, enable);
}

export async function getDNT(): Promise<boolean> {
  return boolean(
    (await readStorage<boolean | string>(DNT_STORAGE_KEY)) ?? process.env.DEBUG
  );
}

export async function allowsTrack(): Promise<boolean> {
  return !(await getDNT());
}

export function useDNT(): [boolean, (enabled: boolean) => Promise<void>] {
  const [enabled, setEnabled] = useState<boolean>(true);

  useAsyncEffect(async () => {
    setEnabled(await getDNT());
  }, [setEnabled]);

  const toggle = useCallback(
    async (enabled: boolean) => {
      await setDNT(enabled);
      setEnabled(enabled);
    },
    [setEnabled]
  );

  return [enabled, toggle];
}
