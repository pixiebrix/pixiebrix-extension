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
import {
  removeDraftModComponents,
  removeDraftModComponentsForMod,
} from "@/pageEditor/store/editor/editorStorage";
import { actions as extensionActions } from "@/store/extensionsSlice";
import { removeModComponentForEveryTab } from "@/background/messenger/api";
import { uniq } from "lodash";
import { type SerializedModComponent } from "@/types/modComponentTypes";
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
 */
export async function deactivateMod(
  modId: RegistryId,
  modComponents: SerializedModComponent[],
  dispatch: Dispatch<unknown>,
): Promise<void> {
  const draftModComponentsToDeactivate =
    await removeDraftModComponentsForMod(modId);

  dispatch(extensionActions.removeModById(modId));

  removeModComponentsFromAllTabs(
    uniq([
      ...modComponents.map(({ id }) => id),
      ...draftModComponentsToDeactivate,
    ]),
  );
}

/**
 * Use this helper outside the Page Editor context to deactivate a collections of mod components.
 */
export async function deactivateModComponents(
  modComponentIds: UUID[],
  dispatch: Dispatch<unknown>,
): Promise<void> {
  await removeDraftModComponents(modComponentIds);

  dispatch(extensionActions.removeModComponents({ modComponentIds }));

  removeModComponentsFromAllTabs(modComponentIds);
}

export function removeModComponentsFromAllTabs(modComponentIds: UUID[]): void {
  for (const modComponentId of modComponentIds) {
    removeModComponentForEveryTab(modComponentId);
  }
}
