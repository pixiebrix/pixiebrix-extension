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
import { removeDraftModComponentsByModId } from "@/store/editorStorage";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import {
  clearLog,
  deleteSynchronizedModVariables,
  removeModComponentForEveryTab,
} from "@/background/messenger/api";
import { uniq } from "lodash";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { forbidContext } from "@/utils/expectContext";

/**
 * @file utility methods to deactivate mods/mod components and remove from the existing tabs.
 *
 * Mocked in src/__mocks__/@/store/deactivateModHelpers.ts.
 */

/**
 * Use this helper outside the Page Editor context to deactivate a mod and all of its mod components. In the Page
 * Editor, use useDeactivateMod instead.
 *
 * @see useDeactivateMod
 * @see removeModDataAndInterfaceFromAllTabs
 */
export async function deactivateMod(
  modId: RegistryId,
  modComponentIds: UUID[],
  dispatch: Dispatch<unknown>,
): Promise<void> {
  forbidContext("pageEditor");

  const removedDraftModComponentIds =
    await removeDraftModComponentsByModId(modId);

  dispatch(modComponentActions.removeModById(modId));

  await removeModDataAndInterfaceFromAllTabs(
    modId,
    uniq([...modComponentIds, ...removedDraftModComponentIds]),
  );
}

/**
 * Utility to remove a mod from all tabs/frames and clear its associated data.
 *
 * Removes from:
 * - Notifies all tabs to remove the mod components
 * - browser.storage.session synchronized mod variables
 * - PixieBrix mod logs
 *
 * @param modId the mod registry id
 * @param modComponentIds the mod component ids
 */
// Currently requires passing modComponentIds explicitly because some runtime features, e.g., context menus,
// are registered solely using the mod component id
export async function removeModDataAndInterfaceFromAllTabs(
  modId: RegistryId,
  modComponentIds: UUID[],
): Promise<void> {
  for (const modComponentId of uniq(modComponentIds)) {
    removeModComponentForEveryTab(modComponentId);
  }

  await Promise.all([
    deleteSynchronizedModVariables(modId),
    clearLog({ modId }),
  ]);
}
