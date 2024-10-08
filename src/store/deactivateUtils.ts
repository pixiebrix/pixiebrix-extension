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

import { type Dispatch } from "react";
import { removeDraftModComponentsForMod } from "@/store/editorStorage";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import {
  deleteSynchronizedModVariables,
  removeModComponentForEveryTab,
} from "@/background/messenger/api";
import { uniq } from "lodash";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";

/**
 * @file utility methods to deactivate mods/mod components and remove from the existing tabs.
 *
 * Mocked in src/__mocks__/@/store/deactivateUtils.ts.
 */

/**
 * Use this helper outside the Page Editor context to deactivate a mod and all of its mod components.
 *
 * Removes from:
 * - Extension Options slice
 * - Draft mod components slice (i.e., Page Editor state)
 * - Notifies all tabs to remove the mod components
 * - browser.storage.session synchronized mod variables
 */
export async function deactivateMod(
  modId: RegistryId,
  modComponentIds: UUID[],
  dispatch: Dispatch<unknown>,
): Promise<void> {
  const removedDraftModComponentIds =
    await removeDraftModComponentsForMod(modId);

  dispatch(modComponentActions.removeModById(modId));

  removeModComponentsFromAllTabs(
    uniq([...modComponentIds, ...removedDraftModComponentIds]),
  );

  await deleteSynchronizedModVariables(modId);
}

export function removeModComponentsFromAllTabs(modComponentIds: UUID[]): void {
  for (const modComponentId of modComponentIds) {
    removeModComponentForEveryTab(modComponentId);
  }
}
