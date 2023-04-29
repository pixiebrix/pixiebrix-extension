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

import { type RecipeDefinition } from "@/types/recipeTypes";
import { type ServiceAuthPair } from "@/types/serviceTypes";
import { collectPermissions } from "@/permissions";
import { resolveRecipe } from "@/registry/internal";
import { requestPermissions } from "@/utils/permissions";
import { containsPermissions } from "@/background/messenger/api";
import { isEmpty } from "lodash";

/**
 * Returns true if the recipe has the necessary permissions to run.
 * @param recipe the recipe definition
 * @param selectedAuths selected integration configurations
 * @see ensureRecipePermissions
 */
export async function checkRecipePermissions(
  recipe: RecipeDefinition,
  selectedAuths: ServiceAuthPair[]
): Promise<boolean> {
  const extensionDefinitions = await resolveRecipe(recipe);
  const collectedPermissions = await collectPermissions(
    extensionDefinitions,
    selectedAuths
  );

  if (isEmpty(collectedPermissions)) {
    // Small performance enhancement to avoid hitting background worker
    return true;
  }

  return containsPermissions(collectedPermissions);
}

/**
 * Ensures that the recipe has the necessary permissions to run. If not, prompts the user to grant them. NOTE: Must
 * be called from a user gesture.
 * @param recipe the recipe definition
 * @param selectedAuths selected integration configurations
 * @see checkRecipePermissions
 */
export default async function ensureRecipePermissions(
  recipe: RecipeDefinition,
  selectedAuths: ServiceAuthPair[]
): Promise<boolean> {
  const resolved = await resolveRecipe(recipe);
  const collectedPermissions = await collectPermissions(
    resolved,
    selectedAuths
  );

  if (isEmpty(collectedPermissions)) {
    // Small performance enhancement to avoid hitting background worker
    return true;
  }

  const hasPermissions = await containsPermissions(collectedPermissions);

  if (hasPermissions) {
    return true;
  }

  return requestPermissions(collectedPermissions);
}
