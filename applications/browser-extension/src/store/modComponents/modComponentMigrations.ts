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
  isModComponentStateV0,
  isModComponentStateV1,
  isModComponentStateV2,
  isModComponentStateV3,
  isModComponentStateV4,
  isModComponentStateV5,
  isModComponentStateV6,
  type ModComponentStateV0,
  type ModComponentStateV1,
  type ModComponentStateV2,
  type ModComponentStateV3,
  type ModComponentStateV4,
  type ModComponentStateV5,
  type ModComponentStateV6,
  type ModComponentStateVersions,
} from "@/store/modComponents/modComponentTypes";
import { omit, toLower } from "lodash";
import { migrateIntegrationDependenciesV1toV2 } from "@/store/editorMigrations";
import { nowTimestamp } from "@/utils/timeUtils";
import { type Nullishable } from "@/utils/nullishUtils";
import { type ActivatedModComponentV2 } from "@/types/modComponentTypes";
import { validateRegistryId } from "@/types/helpers";
import { getUserScope } from "@/auth/authUtils";
import { normalizeSemVerString } from "@/types/semVerHelpers";

// eslint-disable-next-line local-rules/persistBackgroundData -- This is never mutated
const migrations: MigrationManifest = {
  // Redux-persist defaults to version: -1; Initialize to 0-indexed
  // state version to match state type names and existing versions
  // The type-guards shouldn't be necessary, but in certain cases, the
  // rehydration can run on ModComponentStateV2 extensions before the
  // _persist key is added
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
  // V4 migration defined via createMigrationsManifest
  5(
    state: ModComponentStateV4 & PersistedState,
  ): ModComponentStateV5 & PersistedState {
    if (isModComponentStateV4(state)) {
      return migrateModComponentStateV4toV5(state);
    }

    return state;
  },
  6(
    state: ModComponentStateV5 & PersistedState,
  ): ModComponentStateV6 & PersistedState {
    if (isModComponentStateV5(state)) {
      return migrateModComponentStateV5toV6(state);
    }

    return state;
  },
};

export async function createMigrationsManifest(): Promise<MigrationManifest> {
  const userScope = await getUserScope();
  return {
    ...migrations,
    4(state: ModComponentStateV3 & PersistedState) {
      if (isModComponentStateV3(state)) {
        return migrateModComponentStateV3toV4(state, userScope);
      }

      return state;
    },
  };
}

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
  const now = nowTimestamp();
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

/**
 * Exported for testing only
 *
 * @see mapStandaloneModDefinitionToModDefinition - similar functionality
 * @internal
 */
export function createModMetadataForStandaloneComponent(
  modComponent: ActivatedModComponentV2,
  userScope: string,
): ActivatedModComponentV2 {
  return {
    ...modComponent,
    _recipe: {
      id: validateRegistryId(
        `${userScope}/converted/${toLower(modComponent.id)}`,
      ),
      name: modComponent.label,
      version: normalizeSemVerString("1.0.0"),
      description: "Page Editor mod automatically converted to a package",
      sharing: {
        public: false,
        organizations: [],
      },
      updated_at: modComponent.updateTimestamp,
    },
  };
}

/**
 * Exported for testing only\
 * @internal
 */
export function migrateStandaloneComponentsToMods(
  modComponents: ActivatedModComponentV2[],
  userScope: Nullishable<string>,
): ActivatedModComponentV2[] {
  return modComponents
    .map((modComponent) => {
      if (modComponent._recipe) {
        return modComponent;
      }

      if (userScope == null) {
        return modComponent;
      }

      return createModMetadataForStandaloneComponent(modComponent, userScope);
    })
    .filter((extension) => extension._recipe != null);
}

function migrateModComponentStateV3toV4(
  state: ModComponentStateV3 & PersistedState,
  userScope: Nullishable<string>,
): ModComponentStateV4 & PersistedState {
  return {
    ...state,
    extensions: migrateStandaloneComponentsToMods(state.extensions, userScope),
  };
}

function migrateModComponentStateV4toV5(
  state: ModComponentStateV4 & PersistedState,
): ModComponentStateV5 & PersistedState {
  return {
    ...omit(state, "extensions"),
    activatedModComponents: state.extensions,
  };
}

function migrateModComponentStateV5toV6(
  state: ModComponentStateV5 & PersistedState,
): ModComponentStateV6 & PersistedState {
  return {
    ...state,
    activatedModComponents: state.activatedModComponents
      // In previous migration, _recipe was added to all activatedModComponents.
      // Exclude un-migrated mod components to be extra defensive
      .filter((x) => x._recipe != null)
      .map((modComponent) => ({
        ...omit(modComponent, ["_recipe", "_deployment"]),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- see filter above
        modMetadata: modComponent._recipe!,
        deploymentMetadata: modComponent._deployment,
      })),
  };
}

export function inferModComponentStateVersion(
  state: ModComponentStateVersions,
): number {
  // Check highest numbered versions first, because empty state (without any activated mods) matches multiple versions
  if (isModComponentStateV6(state)) {
    return 6;
  }

  if (isModComponentStateV5(state)) {
    return 5;
  }

  if (isModComponentStateV4(state)) {
    return 4;
  }

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
