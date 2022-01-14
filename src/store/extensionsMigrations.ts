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

import { MigrationManifest, PersistedState } from "redux-persist/es/types";
import { PersistedExtension } from "@/core";
import {
  ExtensionOptionsState,
  LegacyExtensionObjectShapeState,
  LegacyExtensionObjectState,
  OptionsState,
} from "@/store/extensionsTypes";

export const migrations: MigrationManifest = {
  1: (state: PersistedState & OptionsState) => migrateExtensionsShape(state),
  2: (state: PersistedState & OptionsState) =>
    migrateActiveExtensions(
      state as PersistedState & LegacyExtensionObjectState
    ),
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
