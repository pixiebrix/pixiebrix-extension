/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { selectExtensions } from "@/options/selectors";
import { useCallback } from "react";
import { uninstallContextMenu } from "@/background/messenger/api";
import { optionsSlice } from "@/options/slices";
import { groupBy, uniq } from "lodash";
import { IExtension, UUID, RegistryId } from "@/core";

const { installRecipe, removeExtension } = optionsSlice.actions;

type Reinstall = (recipe: RecipeDefinition) => Promise<void>;

function selectAuths(extensions: IExtension[]): Record<RegistryId, UUID> {
  const serviceAuths = groupBy(
    extensions.flatMap((x) => x.services),
    (x) => x.id
  );
  const result: Record<RegistryId, UUID> = {};
  for (const [id, auths] of Object.entries(serviceAuths)) {
    const configs = uniq(auths.map(({ config }) => config));
    if (configs.length === 0) {
      throw new Error(`Service ${id} is not configured`);
    } else if (configs.length > 1) {
      throw new Error(`Service ${id} has multiple configurations`);
    }

    result[id as RegistryId] = configs[0];
  }

  return result;
}

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

      const currentAuths = selectAuths(recipeExtensions);

      // Uninstall first to avoid duplicates
      await Promise.all(
        recipeExtensions.map(async (extension) => {
          const extensionRef = { extensionId: extension.id };
          await uninstallContextMenu(extensionRef);
          dispatch(removeExtension(extensionRef));
        })
      );

      dispatch(
        installRecipe({
          recipe,
          extensionPoints: recipe.extensionPoints,
          services: currentAuths,
        })
      );
    },
    [dispatch, extensions]
  );
}

export default useReinstall;
