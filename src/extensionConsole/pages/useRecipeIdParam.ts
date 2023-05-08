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

import { type RegistryId } from "@/types/registryTypes";
import { useParams } from "react-router";
import { validateRegistryId } from "@/types/helpers";

/**
 * Search the React-Router dynamic route parameters for a :recipeId param,
 * convert it into a RegistryId, and return it. Can be used with any route
 * that includes a :recipeId param.
 */
export function useRecipeIdParam(): RegistryId | null {
  const { recipeId } = useParams<{ recipeId: string }>();
  try {
    return validateRegistryId(decodeURIComponent(recipeId));
  } catch {
    return null;
  }
}
