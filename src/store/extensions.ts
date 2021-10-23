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
import { IExtension, PersistedExtension } from "@/core";

const migrations: MigrationManifest = {
  1: (state: PersistedState & OptionsState) => migrateExtensionsShape(state),
  2: (state: PersistedState & OptionsState) =>
    migrateActiveExtensions(
      state as PersistedState & LegacyExtensionObjectState
    ),
};

export const persistOptionsConfig = {
  key: "extensionOptions",
  storage: localStorage,
  version: 2,
  // https://github.com/rt2zz/redux-persist#migrations
  migrate: createMigrate(migrations, { debug: boolean(process.env.DEBUG) }),
};

/**
 * @deprecated use PersistedOptionsState - this is only used in the migration
 */
type LegacyExtensionObjectShapeState = {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record doesn't allow labelled keys
  extensions: {
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record doesn't allow labelled keys
    [extensionPointId: string]: {
      [extensionId: string]: IExtension;
    };
  };
};

/**
 * @deprecated use ExtensionOptionsState - this is only used in a migration
 */
export type LegacyExtensionObjectState = {
  extensions: IExtension[];
};

export type ExtensionOptionsState = {
  extensions: PersistedExtension[];
};

// Putting here because it was causing circular dependencies
export function migrateExtensionsShape<T>(
  state: T & (LegacyExtensionObjectShapeState | LegacyExtensionObjectState)
): T & LegacyExtensionObjectState {
  if (state.extensions == null) {
    console.info("Repairing redux state");
    return { ...state, extensions: [] };
  }

  if (Array.isArray(state.extensions)) {
    // Already migrated
    console.debug("Redux state already up-to-date");
    return state as T & LegacyExtensionObjectState;
  }

  console.info("Migrating Redux state");

  return {
    ...state,
    extensions: Object.values(state.extensions).flatMap((extensionMap) =>
      Object.values(extensionMap)
    ),
  };
}

export function migrateActiveExtensions<T>(
  state: T & (LegacyExtensionObjectState | ExtensionOptionsState)
): T & ExtensionOptionsState {
  const timestamp = new Date().toISOString();

  return {
    ...state,
    extensions: state.extensions.map((x) => ({
      ...x,
      active: true,
      createTimestamp:
        (x as Partial<PersistedExtension>).createTimestamp ?? timestamp,
      updateTimestamp:
        (x as Partial<PersistedExtension>).updateTimestamp ?? timestamp,
    })),
  };
}

export type OptionsState =
  | LegacyExtensionObjectShapeState
  | LegacyExtensionObjectState
  | ExtensionOptionsState;

/**
 * Throw a `TypeError` if the Redux state has not been migrated.
 */
export function requireLatestState(
  state: OptionsState
): asserts state is LegacyExtensionObjectState | ExtensionOptionsState {
  if (!Array.isArray(state.extensions)) {
    throw new TypeError("redux state has not been migrated");
  }
}
