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

import {
  type MigrationManifest,
  type PersistedState,
} from "redux-persist/es/types";
import { type ActivatedModComponent } from "@/types/extensionTypes";
import {
  type ModComponentOptionsState,
  type LegacyModComponentObjectShapeState,
  type LegacyModComponentObjectState,
  type OptionsState,
} from "@/store/extensionsTypes";

export const migrations: MigrationManifest = {
  1: (state: PersistedState & OptionsState) => migrateExtensionsShape(state),
  2: (state: PersistedState & OptionsState) =>
    migrateActiveExtensions(
      state as PersistedState & LegacyModComponentObjectState
    ),
};

// Putting here because it was causing circular dependencies
export function migrateExtensionsShape<T>(
  state: T &
    (LegacyModComponentObjectShapeState | LegacyModComponentObjectState)
): T & LegacyModComponentObjectState {
  if (state.extensions == null) {
    return { ...state, extensions: [] };
  }

  if (Array.isArray(state.extensions)) {
    // Already migrated
    return state as T & LegacyModComponentObjectState;
  }

  return {
    ...state,
    extensions: Object.values(state.extensions).flatMap((extensionMap) =>
      Object.values(extensionMap)
    ),
  };
}

export function migrateActiveExtensions<T>(
  state: T & (LegacyModComponentObjectState | ModComponentOptionsState)
): T & ModComponentOptionsState {
  const timestamp = new Date().toISOString();

  return {
    ...state,
    extensions: state.extensions.map((x) => ({
      ...x,
      active: true,
      createTimestamp:
        (x as Partial<ActivatedModComponent>).createTimestamp ?? timestamp,
      updateTimestamp:
        (x as Partial<ActivatedModComponent>).updateTimestamp ?? timestamp,
    })),
  };
}
