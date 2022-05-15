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
import { set } from "lodash";
import { JsonObject } from "type-fest";

export const LOCAL_DATA_STORE = "LOCAL_DATA_STORE" as ManualStorageKey;
export const KEY_PREFIX = "@@";

export async function getRecord(primaryKey: string): Promise<unknown> {
  const data = await readStorage<Record<string, unknown>>(LOCAL_DATA_STORE, {});
  return data[`${KEY_PREFIX}${primaryKey}`] ?? {};
}

export async function setRecord(
  primaryKey: string,
  value: JsonObject
): Promise<void> {
  const data = await readStorage<Record<string, unknown>>(LOCAL_DATA_STORE, {});
  set(data, `${KEY_PREFIX}${primaryKey}`, value);
  await setStorage(LOCAL_DATA_STORE, data);
}
