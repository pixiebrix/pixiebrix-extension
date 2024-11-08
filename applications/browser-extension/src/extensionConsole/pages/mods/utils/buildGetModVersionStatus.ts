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

import { type Mod, type ModVersionStatus } from "@/types/modTypes";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { isUnavailableMod } from "@/utils/modUtils";
import * as semver from "semver";
import { type RegistryId, type SemVerString } from "@/types/registryTypes";
import { type Timestamp } from "@/types/stringTypes";
import { type ModInstance } from "@/types/modInstanceTypes";

type ModVersionInfo = {
  version: SemVerString;
  updatedAt: Timestamp;
};

function isLatestVersion(
  activated: Nullishable<ModVersionInfo>,
  current: Nullishable<ModVersionInfo>,
): boolean {
  if (current == null || activated == null) {
    return true; // No update available if either version is null
  }

  if (semver.gt(current.version, activated.version)) {
    return false;
  }

  if (semver.lt(current.version, activated.version)) {
    return true;
  }

  // Versions are equal, compare updated_at timestamp
  return new Date(current.updatedAt) <= new Date(activated.updatedAt);
}

function getModVersionInfo(mod: Mod): ModVersionInfo | null {
  if (isUnavailableMod(mod)) {
    return null;
  }

  assertNotNullish(
    mod.metadata.version,
    `Mod version is null for mod: ${mod.metadata.id}, something went wrong`,
  );

  return {
    version: mod.metadata.version,
    updatedAt: mod.updated_at,
  };
}

function getActivatedModVersionInfo(
  modInstance: ModInstance | undefined,
): ModVersionInfo | null {
  if (modInstance == null) {
    return null;
  }

  const { version, id } = modInstance.definition.metadata;

  assertNotNullish(
    version,
    `Unexpected missing version for activated mod: ${id}`,
  );

  return {
    version,
    updatedAt: modInstance.definition.updated_at,
  };
}

export default function buildGetModVersionStatus(
  modInstanceMap: Map<RegistryId, ModInstance>,
): (mod: Mod) => ModVersionStatus {
  return (mod: Mod) => {
    const modInstance = modInstanceMap.get(mod.metadata.id);

    const currentVersionInfo = getModVersionInfo(mod);
    const activatedVersionInfo = getActivatedModVersionInfo(modInstance);

    return {
      hasUpdate: !isLatestVersion(activatedVersionInfo, currentVersionInfo),
      activatedModVersion: activatedVersionInfo?.version ?? null,
    };
  };
}
