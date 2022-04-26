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
import { groupBy, uniq } from "lodash";
import { IExtension, UUID, RegistryId, UserOptions } from "@/core";
import extensionsSlice from "@/store/extensionsSlice";

const { installRecipe, removeExtension } = extensionsSlice.actions;

type Reinstall = (recipe: RecipeDefinition) => Promise<void>;

function selectOptions(extensions: IExtension[]): UserOptions {
  // For a given recipe, all the extensions receive the same options during the install process (even if they don't
  // use the options), so we can just take the optionsArgs for any of the extensions
  return extensions[0]?.optionsArgs ?? {};
}

function selectAuths(
  extensions: IExtension[],
  { optional = false }: { optional?: boolean } = {}
): Record<RegistryId, UUID> {
  // The extensions for the recipe will only have the services that are declared on each extension. So we have to take
  // the union of the service credentials. There's currently no way in the UX that the service auths could become
  // inconsistent for a given service key, but guard against that case anyway.

  const serviceAuths = groupBy(
    extensions.flatMap((x) => x.services ?? []),
    (x) => x.id
  );
  const result: Record<RegistryId, UUID> = {};
  for (const [id, auths] of Object.entries(serviceAuths)) {
    const configs = uniq(auths.map(({ config }) => config));
    if (configs.length === 0 && !optional) {
      throw new Error(`Service ${id} is not configured`);
    }

    // If optional is passed in, we know that the user is being given an opportunity to switch which config is applied,
    // so the user can always switch to a different configuration if they want.
    if (configs.length > 1 && !optional) {
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

      const currentAuths = selectAuths(recipeExtensions, { optional: false });
      const currentOptions = selectOptions(recipeExtensions);

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

export { selectAuths, selectOptions };
export default useReinstall;
