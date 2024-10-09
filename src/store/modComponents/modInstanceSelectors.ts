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
import { groupBy } from "lodash";
import { mapActivatedModComponentsToModInstance } from "@/store/modComponents/modInstanceUtils";
import type { ModComponentsRootState } from "@/store/modComponents/modComponentTypes";

/**
 * Returns all activated mod instances.
 * @throws {TypeError} if required state migrations have not been applied yet
 */
// Written using createSelector to memoize because it creates a new object. Not a big deal at the moment because
// that's the only property in the slice. But it's good habit to memoize properly.
export const selectModInstances = createSelector(
  (state: ModComponentsRootState) => state.options.activatedModComponents,
  (activatedModComponents) => {
    if (!Array.isArray(activatedModComponents)) {
      throw new TypeError("state migration has not been applied yet");
    }

    return Object.values(
      groupBy(activatedModComponents, (x) => x.modMetadata.id),
    ).map((modComponents) =>
      mapActivatedModComponentsToModInstance(modComponents),
    );
  },
);

/**
 * Returns a Map of activated mod instances keyed by mod id.
 * @see useFindModInstance
 */
export const selectModInstanceMap = createSelector(
  selectModInstances,
  (modInstances) =>
    new Map(
      modInstances.map((modInstance) => [
        modInstance.definition.metadata.id,
        modInstance,
      ]),
    ),
);
