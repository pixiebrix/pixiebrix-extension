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

import { type Dispatch } from "react";
import { removeDynamicElementsForRecipe } from "@/store/dynamicElementStorage";
import { type UnresolvedExtension, type RegistryId } from "@/core";
import { actions as extensionActions } from "@/store/extensionsSlice";
import { removeExtensionForEveryTab } from "@/background/messenger/api";
import { uniq } from "lodash";

export async function uninstallRecipe(
  recipeId: RegistryId,
  recipeExtensions: UnresolvedExtension[],
  dispatch: Dispatch<unknown>
): Promise<void> {
  dispatch(extensionActions.removeRecipeById(recipeId));

  const dynamicElementsToUninstall = await removeDynamicElementsForRecipe(
    recipeId
  );

  for (const id of uniq([
    ...recipeExtensions.map(({ id }) => id),
    ...dynamicElementsToUninstall.map(({ uuid }) => uuid),
  ])) {
    removeExtensionForEveryTab(id);
  }
}
