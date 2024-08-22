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

import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type Mod, type ModVersionStatus } from "@/types/modTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import { isUnavailableMod } from "@/utils/modUtils";
import * as semver from "semver";

export default function buildGetModVersionStatus(
  activatedModComponents: ActivatedModComponent[],
): (mod: Mod) => ModVersionStatus {
  return (mod: Mod) => {
    const activatedComponentFromMod = activatedModComponents.find(
      ({ _recipe }) => _recipe?.id === mod.metadata.id,
    );

    if (activatedComponentFromMod == null) {
      return {
        hasUpdate: false,
        activatedModVersion: null,
      };
    }

    const metadataFromActivatedModComponent =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion,@typescript-eslint/no-non-null-assertion -- We've migrated _recipe to be non-null everywhere but the type isn't updated yet
      activatedComponentFromMod._recipe!;

    const { version: activatedModVersion, updated_at: activatedModUpdatedAt } =
      metadataFromActivatedModComponent;
    assertNotNullish(
      activatedModVersion,
      `Activated mod version is null for mod: ${mod.metadata.id}, something went wrong`,
    );
    assertNotNullish(
      activatedModUpdatedAt,
      `Activated mod updated_at is null for mod: ${mod.metadata.id}, something went wrong`,
    );

    if (isUnavailableMod(mod)) {
      // Unavailable mods are never update-able
      return {
        hasUpdate: false,
        activatedModVersion,
      };
    }

    assertNotNullish(
      mod.metadata.version,
      `Mod version is null for mod: ${mod.metadata.id}, something went wrong`,
    );

    if (semver.gt(mod.metadata.version, activatedModVersion)) {
      return {
        hasUpdate: true,
        activatedModVersion,
      };
    }

    if (semver.lt(mod.metadata.version, activatedModVersion)) {
      return {
        hasUpdate: false,
        activatedModVersion,
      };
    }

    // Versions are equal, compare updated_at
    const modUpdatedDate = new Date(mod.updated_at);
    const activatedComponentUpdatedDate = new Date(activatedModUpdatedAt);
    return {
      hasUpdate: modUpdatedDate > activatedComponentUpdatedDate,
      activatedModVersion,
    };
  };
}
