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

import { type MigrationManifest, type PersistedState } from "redux-persist";
import migratePersistedState from "@/store/migratePersistedState";
import { mapValues } from "lodash";
import { type SetOptional } from "type-fest";
import { isObject } from "./objectUtils";

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

export function validateReduxStorageKey(key: string): ReduxStorageKey {
  if (!key.startsWith("persist:")) {
    throw new Error(
      `Expected storage key ${key} to start with "persist:" prefix`,
    );
  }

  return key as ReduxStorageKey;
}

/**
 * Read the persisted redux state directly out of storage, applying any necessary migrations. This could be
 * called before the redux store is instantiated.
 * @param storageKey the storage key for the redux state/slice
 * @param migrations if needed, the redux-persist migrations for the returned state/slice type
 * @param defaultValue default value to return if the key is not defined in storage, or a non-object value is found
 * @param inferPersistedVersion if needed, a function to infer the persisted version for the returned state/slice type
 */
/* eslint-disable-next-line @typescript-eslint/ban-types --
We want to accept redux state objects here without making every state type
extend UnknownObject, or making the call-sites awful, so plain object works
better than Record or UnknownObject. There are type checks in the function
body for safety. We'll need to re-type all state slices and fix tests in
order to refactor this to use UnknownObject instead of object. */
export async function readReduxStorage<T extends object | undefined>(
  storageKey: ReduxStorageKey,
  migrations: MigrationManifest,
  defaultValue: T,
  inferPersistedVersion?: (state: UnknownObject) => number,
): Promise<T> {
  const result = await browser.storage.local.get(storageKey);
  // eslint-disable-next-line security/detect-object-injection -- Hardcoded keys
  const storageValue = result[storageKey] as T | string | undefined;

  if (typeof storageValue !== "string") {
    if (storageValue !== undefined) {
      console.warn("Expected JSON-stringified value for key %s", storageKey, {
        storageValue,
      });
    }

    return defaultValue;
  }

  // Note: Redux-persist stores state/slice objects with JSON-stringified
  // values for each property, one level deep, and then the entire slice
  // object itself also stringified as the value for the storage key.
  const serializedState = JSON.parse(storageValue);

  if (!isObject(serializedState)) {
    console.warn("Expected 'jsonified object' for key %s", storageKey, {
      storageValue,
    });

    return defaultValue;
  }

  const parsedState = mapValues(serializedState, (value) =>
    JSON.parse(String(value)),
  );
  return migratePersistedState<T>(
    parsedState,
    migrations,
    inferPersistedVersion,
  );
}

/**
 * Set the persisted redux state directly in storage.
 * @param storageKey the storage key for the redux state/slice
 * @param state the redux state/slice to set in storage
 * @param defaultPersistenceVersion the default version to save in the redux-persist object; mostly only needed for testing
 */
/* eslint-disable-next-line @typescript-eslint/ban-types --
We want to accept redux state objects here without making every state type
extend UnknownObject, or making the call-sites awful, so plain object works
better than Record or UnknownObject. There are type checks in the function
body for safety. We'll need to re-type all state slices and fix tests in
order to refactor this to use UnknownObject instead of object. */
export async function setReduxStorage<T extends object>(
  storageKey: ReduxStorageKey,
  // Optional persistence for flexibility at call-sites
  state: T & SetOptional<NonNullable<PersistedState>, "_persist">,
  defaultPersistenceVersion: number,
): Promise<void> {
  if (typeof state !== "object") {
    throw new TypeError(
      `Expected object value for redux storage key ${storageKey}`,
    );
  }

  // Make a copy in case we need to modify the state passed in before storing
  const stateToStore = {
    ...state,
  };

  // Due to the way our legacy code worked for accessing redux-persist storage,
  // there's a very small chance that a user could end up with a state with
  // the _persist property removed. We also want to allow tests to pass in
  // state objects without manually setting the _persist property. So, we
  // add the _persist property here if it's missing.
  if (stateToStore._persist == null) {
    (stateToStore as T & PersistedState)._persist = {
      version: defaultPersistenceVersion,
      rehydrated: false,
    };
  }

  // Note: Redux-persist stores state/slice objects with JSON-stringified
  // values for each property, one level deep, and then the entire slice
  // object itself also stringified as the value for the storage key.
  await browser.storage.local.set({
    [storageKey]: JSON.stringify(jsonifyObject(state)),
  });
}

/**
 * Return an object with the same keys as the input object, but with the values JSON-stringified.
 * @param object the object to jsonify
 */
// eslint-disable-next-line @typescript-eslint/ban-types -- Record breaks type inference at call-sites
function jsonifyObject<T extends object>(object: T): Record<string, string> {
  return mapValues(object, (value) => JSON.stringify(value));
}
