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

import { type RecipeDefinition } from "@/types/definitions";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useCallback } from "react";
import { actions as extensionActions } from "@/store/extensionsSlice";
import { inferRecipeAuths, inferRecipeOptions } from "@/store/extensionsUtils";
import { uninstallRecipe } from "./uninstallRecipe";

type Reinstall = (recipe: RecipeDefinition) => Promise<void>;

function useReinstall(): Reinstall {
  const dispatch = useDispatch();
  const extensions = useSelector(selectExtensions);

  return useCallback(
    async (recipe: RecipeDefinition) => {
      const recipeId = recipe.metadata.id;
      const recipeExtensions = extensions.filter(
        (x) => x._recipe?.id === recipeId
      );

      if (recipeExtensions.length === 0) {
        throw new Error(`No bricks to re-activate for ${recipeId}`);
      }

      const currentOptions = inferRecipeOptions(recipeExtensions);

      const currentAuths = inferRecipeAuths(recipeExtensions, {
        optional: false,
      });

      await uninstallRecipe(recipeId, recipeExtensions, dispatch);

      dispatch(
        extensionActions.installRecipe({
          recipe,
          extensionPoints: recipe.extensionPoints,
          services: currentAuths,
          optionsArgs: currentOptions,
        })
      );
    },
    [dispatch, extensions]
  );
}

export { inferRecipeAuths, inferRecipeOptions };
export default useReinstall;
