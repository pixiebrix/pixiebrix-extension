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
import {
  type ModComponentStateVersions,
  type ModComponentStateV0,
  type ModComponentStateV1,
  type ModComponentStateV2,
  isModComponentStateV0,
  isModComponentStateV1,
} from "@/store/extensionsTypes";
import { isEmpty } from "lodash";

export const migrations: MigrationManifest = {
  // Redux-persist defaults to version: -1; Initialize to 0-indexed
  // state version to match state type names and existing versions
  // The typeguards shouldn't be necessary, but in certain cases, the rehydration can run
  // on ModComponentStateV2 extensions before the _persist key is added
  0: (state) => state,
  1(state: ModComponentStateVersions & PersistedState) {
    if (isModComponentStateV0(state)) {
      return migrateModComponentStateV0(state);
    }

    return state;
  },
  2(state: ModComponentStateV1 & PersistedState) {
    if (isModComponentStateV1(state)) {
      return migrateModComponentStateV1(state);
    }

    return state;
  },
};

function migrateModComponentStateV0(
  state: ModComponentStateV0 & PersistedState
): ModComponentStateV1 & PersistedState {
  return {
    ...state,
    extensions: Object.values(state.extensions).flatMap((extension) =>
      Object.values(extension)
    ),
  };
}

function migrateModComponentStateV1(
  state: ModComponentStateV1 & PersistedState
): ModComponentStateV2 & PersistedState {
  const now = new Date().toISOString();
  return {
    ...state,
    extensions: state.extensions.map((x) => ({
      ...x,
      active: true,
      createTimestamp: now,
      updateTimestamp: now,
    })),
  };
}

export function inferModComponentStateVersion(
  state: ModComponentStateVersions
): number {
  if (isEmpty(state.extensions)) {
    return 3;
  }

  if (Array.isArray(state.extensions)) {
    if (
      "createTimestamp" in state.extensions[0] &&
      "updateTimestamp" in state.extensions[0]
    ) {
      return 3;
    }

    return 2;
  }

  return 1;
}
