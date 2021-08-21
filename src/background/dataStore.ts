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

import { readStorage, setStorage } from "@/chrome";
import { JsonObject } from "type-fest";
import { liftBackground } from "./protocol";
import { SerializableResponse } from "@/messaging/protocol";

export const LOCAL_DATA_STORE = "LOCAL_DATA_STORE";
export const KEY_PREFIX = "@@";

async function _getRecord(uuid: string): Promise<unknown> {
  const rawData = (await readStorage<string>(LOCAL_DATA_STORE)) ?? "{}";
  const data = JSON.parse(rawData);
  const key = `${KEY_PREFIX}${uuid}`;
  return data[key] ?? {};
}

async function _setRecord(uuid: string, value: JsonObject): Promise<void> {
  const rawData = (await readStorage<string>(LOCAL_DATA_STORE)) ?? "{}";
  const data = JSON.parse(rawData);
  const key = `${KEY_PREFIX}${uuid}`;

  data[key] = value;
  await setStorage(LOCAL_DATA_STORE, JSON.stringify(data));
}

export const getRecord = liftBackground(
  "GET_DATA_STORE",
  async (uuid: string) => _getRecord(uuid) as SerializableResponse
);

export const setRecord = liftBackground(
  "SET_DATA_STORE",
  async (uuid: string, value: JsonObject) => {
    await _setRecord(uuid, value);
  }
);
