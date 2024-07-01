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

import { localStorage } from "redux-persist-webextension-storage";
import { createMigrate } from "redux-persist";
import {
  inferModComponentStateVersion,
  migrations,
} from "@/store/extensionsMigrations";
import { type ModComponentState } from "./extensionsTypes";
import { type StorageInterface } from "@/store/StorageInterface";
import { type RegistryId } from "@/types/registryTypes";
import { compact, isEmpty } from "lodash";
import { boolean } from "@/utils/typeUtils";
import {
  readReduxStorage,
  setReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";
import { getMaxMigrationsVersion } from "@/store/migratePersistedState";
import { initialState } from "@/store/extensionsSliceInitialState";

const STORAGE_KEY = validateReduxStorageKey("persist:extensionOptions");

export async function getModComponentState(): Promise<ModComponentState> {
  return readReduxStorage<ModComponentState>(
    STORAGE_KEY,
    migrations,
    initialState,
    inferModComponentStateVersion,
  );
}

/**
 * Returns the set of currently activated mod ids. Reads current activated mods from storage.
 */
export async function getActivatedModIds(): Promise<
  Set<RegistryId | undefined>
> {
  const modComponentState = await getModComponentState();

  if (isEmpty(modComponentState?.extensions)) {
    return new Set();
  }

  return new Set(
    compact(modComponentState.extensions.map(({ _recipe }) => _recipe?.id)),
  );
}

/**
 * Save mod component state to local storage (without going through redux-persistor).
 */
export async function saveModComponentState(
  state: ModComponentState,
): Promise<void> {
  await setReduxStorage(
    STORAGE_KEY,
    state,
    getMaxMigrationsVersion(migrations),
  );
}

export const persistModComponentOptionsConfig = {
  key: "extensionOptions",
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 3,
  // https://github.com/rt2zz/redux-persist#migrations
  migrate: createMigrate(migrations, { debug: boolean(process.env.DEBUG) }),
};
