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

import { createSelector } from "@reduxjs/toolkit";
import { groupBy, memoize } from "lodash";
import type { RegistryId } from "@/types/registryTypes";
import { mapActivatedModComponentsToModInstance } from "@/store/modComponents/modInstanceUtils";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import type { ModComponentsRootState } from "@/store/modComponents/modComponentTypes";
import type { ModInstance } from "@/types/modInstanceTypes";

/**
 * Returns the mod instance for a given mod, or undefined if the mod is not activated on the device.
 * @throws {TypeError} if required state migrations have not been applied yet
 * @see useFindModInstance
 * @see selectGetModComponentsForMod
 */
export const selectGetModInstanceForMod = createSelector(
  selectActivatedModComponents,
  (activatedModComponents) =>
    memoize((modId: RegistryId) => {
      const modComponents = activatedModComponents.filter(
        (activatedModComponent) => activatedModComponent._recipe?.id === modId,
      );

      if (modComponents.length > 0) {
        return mapActivatedModComponentsToModInstance(modComponents);
      }
    }),
);

/**
 * Returns all activated mod instances.
 * @throws {TypeError} if required state migrations have not been applied yet
 */
export function selectModInstances({
  options,
}: ModComponentsRootState): ModInstance[] {
  if (!Array.isArray(options.activatedModComponents)) {
    console.warn("state migration has not been applied yet", {
      options,
    });
    throw new TypeError("state migration has not been applied yet");
  }

  return Object.values(
    groupBy(options.activatedModComponents, (x) => x._recipe?.id),
  ).map((modComponents) =>
    mapActivatedModComponentsToModInstance(modComponents),
  );
}
