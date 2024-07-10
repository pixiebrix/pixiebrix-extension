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
import {
  type ModComponentStateVersions,
  type ModComponentStateV0,
  type ModComponentStateV1,
  type ModComponentStateV2,
  type ModComponentStateV3,
  isModComponentStateV0,
  isModComponentStateV1,
  isModComponentStateV2,
  isModComponentStateV3,
} from "@/store/extensionsTypes";
import { omit } from "lodash";
import { migrateIntegrationDependenciesV1toV2 } from "@/store/editorMigrations";

export const migrations: MigrationManifest = {
  // Redux-persist defaults to version: -1; Initialize to 0-indexed
  // state version to match state type names and existing versions
  // The typeguards shouldn't be necessary, but in certain cases, the rehydration can run
  // on ModComponentStateV2 extensions before the _persist key is added
  0: (state) => state,
  1(state: ModComponentStateVersions & PersistedState) {
    if (isModComponentStateV0(state)) {
      return migrateModComponentStateV0ToV1(state);
    }

    return state;
  },
  2(state: ModComponentStateV1 & PersistedState) {
    if (isModComponentStateV1(state)) {
      return migrateModComponentStateV1ToV2(state);
    }

    return state;
  },
  3(state: ModComponentStateV2 & PersistedState) {
    if (isModComponentStateV2(state)) {
      return migrateModComponentStateV2toV3(state);
    }

    return state;
  },
};

function migrateModComponentStateV0ToV1(
  state: ModComponentStateV0 & PersistedState,
): ModComponentStateV1 & PersistedState {
  return {
    ...state,
    extensions: Object.values(state.extensions).flatMap((extension) =>
      Object.values(extension),
    ),
  };
}

function migrateModComponentStateV1ToV2(
  state: ModComponentStateV1 & PersistedState,
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

function migrateModComponentStateV2toV3(
  state: ModComponentStateV2 & PersistedState,
): ModComponentStateV3 & PersistedState {
  return {
    ...state,
    extensions: state.extensions.map((extension) => ({
      ...omit(extension, "services"),
      integrationDependencies: migrateIntegrationDependenciesV1toV2(
        extension.services,
      ),
    })),
  };
}

export function inferModComponentStateVersion(
  state: ModComponentStateVersions,
): number {
  if (isModComponentStateV3(state)) {
    return 3;
  }

  if (isModComponentStateV2(state)) {
    return 2;
  }

  if (isModComponentStateV1(state)) {
    return 1;
  }

  if (isModComponentStateV0(state)) {
    return 0;
  }

  throw new Error("Unknown ModComponentState version", { cause: state });
}
