/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import { readStorage, setStorage } from "@/chrome";
import { JsonObject } from "type-fest";
import { liftBackground } from "./protocol";

export const LOCAL_DATA_STORE = "LOCAL_DATA_STORE";
export const KEY_PREFIX = "@@";

async function _getRecord(uuid: string): Promise<unknown> {
  const rawData = (await readStorage(LOCAL_DATA_STORE)) ?? "{}";
  const data = JSON.parse(rawData as string);
  const key = `${KEY_PREFIX}${uuid}`;
  return data[key] ?? {};
}

async function _setRecord(uuid: string, value: JsonObject): Promise<void> {
  const rawData = (await readStorage(LOCAL_DATA_STORE)) ?? "{}";
  const data = JSON.parse(rawData as string);
  const key = `${KEY_PREFIX}${uuid}`;

  data[key] = value;
  await setStorage(LOCAL_DATA_STORE, JSON.stringify(data));
}

export const getRecord = liftBackground(
  "GET_DATA_STORE",
  async (uuid: string) => {
    return await _getRecord(uuid);
  }
);

export const setRecord = liftBackground(
  "SET_DATA_STORE",
  async (uuid: string, value: JsonObject) => {
    await _setRecord(uuid, value);
  }
);
