/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { RecipeDefinition } from "@/types/definitions";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useCallback } from "react";
import { uninstallContextMenu } from "@/background/messenger/api";
import extensionsSlice from "@/store/extensionsSlice";
import { inferRecipeAuths, inferRecipeOptions } from "@/store/extensionsUtils";

const { installRecipe, removeExtension } = extensionsSlice.actions;

type Reinstall = (recipe: RecipeDefinition) => Promise<void>;

function useReinstall(): Reinstall {
  const dispatch = useDispatch();
  const extensions = useSelector(selectExtensions);

  return useCallback(
    async (recipe: RecipeDefinition) => {
      const recipeExtensions = extensions.filter(
        (x) => x._recipe?.id === recipe.metadata.id
      );

      if (recipeExtensions.length === 0) {
        throw new Error(`No bricks to re-activate for ${recipe.metadata.id}`);
      }

      const currentAuths = inferRecipeAuths(recipeExtensions, {
        optional: false,
      });
      const currentOptions = inferRecipeOptions(recipeExtensions);

      // Uninstall first to avoid duplicates. Use a loop instead of Promise.all to ensure the sequence that each pair
      // of calls that uninstallContextMenu + dispatch occur in. We were having problems with the context menu not
      // unregistered from some of the tabs
      for (const extension of recipeExtensions) {
        const extensionRef = { extensionId: extension.id };
        // eslint-disable-next-line no-await-in-loop -- see comment above
        await uninstallContextMenu(extensionRef);
        dispatch(removeExtension(extensionRef));
      }

      dispatch(
        installRecipe({
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
