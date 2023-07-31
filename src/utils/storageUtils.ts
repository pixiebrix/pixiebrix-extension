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

import { type UnknownObject } from "@/types/objectTypes";
import { type JsonValue } from "type-fest";

/**
 * A storage key managed manually (i.e., not using redux-persist).
 * @see ReduxStorageKey
 */
export type ManualStorageKey = string & {
  _manualStorageKeyBrand: never;
};

/**
 * A storage key managed by redux-persist. Should begin with the `persist:` prefix
 * @see ManualStorageKey
 */
export type ReduxStorageKey = string & {
  _reduxStorageKeyBrand: never;
};

/**
 * Read a value from Chrome storage.
 *
 * Does not support enterprise managed storage. Use `readManagedStorage` for that.
 *
 * @param storageKey the storage key
 * @param defaultValue default value to return if the key is not defined in storage. To distinguish between a missing
 * key and a value of `undefined`, pass a Symbol as the default value.
 * @param area the storage area
 * @see readManagedStorage
 */
export async function readStorage<T = unknown>(
  storageKey: ManualStorageKey,
  defaultValue?: T,
  area: "local" | "session" = "local"
): Promise<T | undefined> {
  // `browser.storage.local` is supposed to have a signature that takes an object that includes default values.
  // On Chrome 93.0.4577.63 that signature appears to return the defaultValue even when the value is set?
  // eslint-disable-next-line security/detect-object-injection -- type-checked
  const result: UnknownObject = await browser.storage[area].get(storageKey);

  if (Object.hasOwn(result, storageKey)) {
    // eslint-disable-next-line security/detect-object-injection -- Just checked with hasOwn
    return result[storageKey] as T;
  }

  return defaultValue;
}

export async function readReduxStorage<T extends JsonValue = JsonValue>(
  storageKey: ReduxStorageKey,
  defaultValue?: T
): Promise<T | undefined> {
  const value = await readStorage(storageKey as unknown as ManualStorageKey);
  if (typeof value === "string") {
    return JSON.parse(value);
  }

  if (value !== undefined) {
    console.warn("Expected JSON-stringified value for key %s", storageKey, {
      value,
    });
  }

  return defaultValue;
}

export async function setStorage(
  storageKey: ManualStorageKey,
  value: unknown,
  area: "local" | "session" = "local"
): Promise<void> {
  // eslint-disable-next-line security/detect-object-injection -- type-checked constant
  await browser.storage[area].set({ [storageKey]: value });
}

export async function setReduxStorage<T extends JsonValue = JsonValue>(
  storageKey: ReduxStorageKey,
  value: T
): Promise<void> {
  await browser.storage.local.set({ [storageKey]: JSON.stringify(value) });
}

/**
 * Return an object with the same keys as the input object, but with the values JSON-stringified.
 * @param object the object to jsonify
 */
export function jsonifyObject<T>(object: T): Record<string, string> {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, JSON.stringify(value)])
  );
}
