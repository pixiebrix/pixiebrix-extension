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

import { useCallback, useState } from "react";
import { useAsyncEffect } from "use-async-effect";
import { boolean } from "../utils/typeUtils";
import { StorageItem } from "webext-storage";

export const dntConfig = new StorageItem<boolean>("DNT");

async function setDNT(enable: boolean): Promise<void> {
  await dntConfig.set(enable);
}

/**
 * DNT stands for Do Not Track, and determines whether we can enable telemetry
 */
export async function getDNT(): Promise<boolean> {
  // The DNT setting was stored as a string at some point, so we need to handle that too
  return boolean((await dntConfig.get()) ?? process.env.DEBUG);
}

export async function allowsTrack(): Promise<boolean> {
  return boolean(process.env.DEV_EVENT_TELEMETRY) || !(await getDNT());
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
    [setEnabled],
  );

  return [enabled, toggle];
}
