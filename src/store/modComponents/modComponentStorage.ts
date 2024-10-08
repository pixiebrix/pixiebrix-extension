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
  createMigrationsManifest,
  inferModComponentStateVersion,
} from "@/store/modComponents/modComponentMigrations";
import { type ModComponentState } from "./modComponentTypes";
import { type StorageInterface } from "@/store/StorageInterface";
import { type RegistryId } from "@/types/registryTypes";
import { boolean } from "@/utils/typeUtils";
import {
  readReduxStorage,
  setReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";
import { getMaxMigrationsVersion } from "@/store/migratePersistedState";
import { initialState } from "@/store/modComponents/modComponentSliceInitialState";
import { type PersistMigrate } from "redux-persist/es/types";
import { compact } from "lodash";

const PERSIST_KEY = "extensionOptions";
const REDUX_STORAGE_KEY = validateReduxStorageKey(`persist:${PERSIST_KEY}`);

export async function getModComponentState(): Promise<ModComponentState> {
  const migrations = await createMigrationsManifest();
  return readReduxStorage<ModComponentState>(
    REDUX_STORAGE_KEY,
    migrations,
    initialState,
    inferModComponentStateVersion,
  );
}

/**
 * Returns the set of currently activated mod ids. Reads current activated mods from storage.
 */
export async function getActivatedModIds(): Promise<Set<RegistryId>> {
  const { activatedModComponents = [] } = await getModComponentState();
  return new Set(
    compact(activatedModComponents.map(({ modMetadata }) => modMetadata.id)),
  );
}

/**
 * Save mod component state to local storage (without going through redux-persistor).
 */
export async function saveModComponentState(
  state: ModComponentState,
): Promise<void> {
  const migrations = await createMigrationsManifest();
  await setReduxStorage(
    REDUX_STORAGE_KEY,
    state,
    getMaxMigrationsVersion(migrations),
  );
}

const migrate: PersistMigrate = async (state, currentVersion) => {
  const migrations = await createMigrationsManifest();
  const migrator = createMigrate(migrations, {
    debug: boolean(process.env.DEBUG),
  });
  return migrator(state, currentVersion);
};

export const persistModComponentOptionsConfig = {
  key: PERSIST_KEY,
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 5,
  // https://github.com/rt2zz/redux-persist#migrations
  migrate,
};
