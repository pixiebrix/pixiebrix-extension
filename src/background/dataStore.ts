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

import { RawStorageKey, readStorageWithMigration, setStorage } from "@/chrome";
import { JsonObject } from "type-fest";
import { liftBackground } from "./protocol";
import { SerializableResponse } from "@/messaging/protocol";

export const LOCAL_DATA_STORE = "LOCAL_DATA_STORE" as RawStorageKey;
export const KEY_PREFIX = "@@";

async function _getRecord(primaryKey: string): Promise<unknown> {
  const data = await readStorageWithMigration<Record<string, unknown>>(
    LOCAL_DATA_STORE,
    {}
  );
  return data[`${KEY_PREFIX}${primaryKey}`] ?? {};
}

async function _setRecord(
  primaryKey: string,
  value: JsonObject
): Promise<void> {
  const data = await readStorageWithMigration<Record<string, unknown>>(
    LOCAL_DATA_STORE,
    {}
  );
  data[`${KEY_PREFIX}${primaryKey}`] = value;
  await setStorage(LOCAL_DATA_STORE, data);
}

export const getRecord = liftBackground(
  "GET_DATA_STORE",
  async (primaryKey: string) => _getRecord(primaryKey) as SerializableResponse
);

export const setRecord = liftBackground(
  "SET_DATA_STORE",
  async (primaryKey: string, value: JsonObject) => {
    await _setRecord(primaryKey, value);
  }
);
