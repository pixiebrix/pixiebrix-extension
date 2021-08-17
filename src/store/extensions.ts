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

import { MigrationManifest, PersistedState } from "redux-persist/es/types";
import { localStorage } from "redux-persist-webextension-storage";
import { createMigrate } from "redux-persist";
import { boolean } from "@/utils";
import { IExtension } from "@/core";

const migrations: MigrationManifest = {
  1: (state: PersistedState & OptionsState) => migrateOptionsState(state),
};

export const persistOptionsConfig = {
  key: "extensionOptions",
  storage: localStorage,
  version: 1,
  // https://github.com/rt2zz/redux-persist#migrations
  migrate: createMigrate(migrations, { debug: boolean(process.env.DEBUG) }),
};

/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- Record<> doesn't allow labelled keys */
/**
 * @deprecated use ExtensionsState - this is only used in the migration
 */
type LegacyExtensionsState = {
  extensions: {
    [extensionPointId: string]: {
      [extensionId: string]: IExtension;
    };
  };
};
/* eslint-enabled @typescript-eslint/consistent-indexed-object-style */

export type ExtensionsOptionsState = {
  extensions: IExtension[];
};

// Putting here because it was causing circular dependencies
export function migrateOptionsState<T>(
  state: T & (LegacyExtensionsState | ExtensionsOptionsState)
): T & ExtensionsOptionsState {
  if (state.extensions == null) {
    console.info("Repairing redux state");
    return { ...state, extensions: [] };
  }

  if (Array.isArray(state.extensions)) {
    // Already migrated
    console.debug("Redux state already up-to-date");
    return state as T & ExtensionsOptionsState;
  }

  console.info("Migrating redux state");

  return {
    ...state,
    extensions: Object.values(state.extensions).flatMap((extensionMap) =>
      Object.values(extensionMap)
    ),
  };
}

export type OptionsState = LegacyExtensionsState | ExtensionsOptionsState;

export function requireLatestState(
  state: OptionsState
): asserts state is ExtensionsOptionsState {
  if (!Array.isArray(state.extensions)) {
    throw new TypeError("redux state has not been migrated");
  }
}
