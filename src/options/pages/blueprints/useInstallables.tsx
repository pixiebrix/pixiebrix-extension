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

import { ResolvedExtension, UUID } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import { useCallback, useContext, useMemo } from "react";
import AuthContext from "@/auth/AuthContext";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useAsyncState } from "@/hooks/common";
import { resolveDefinitions } from "@/registry/internal";
import {
  Installable,
  isPersonal,
  updateAvailable,
} from "@/options/pages/blueprints/installableUtils";
import { useGetCloudExtensionsQuery, useGetRecipesQuery } from "@/services/api";

function useInstallables(): {
  installables: {
    active: Installable[];
    all: Installable[];
    personal: Installable[];
    shared: Installable[];
  };
  isLoading: boolean;
  error: unknown;
} {
  const { scope } = useContext(AuthContext);
  const unresolvedExtensions = useSelector(selectExtensions);

  const recipes = useGetRecipesQuery();
  const cloudExtensions = useGetCloudExtensionsQuery();

  const installedExtensionIds = useMemo(
    () => new Set<UUID>(unresolvedExtensions.map((extension) => extension.id)),
    [unresolvedExtensions]
  );

  const installedRecipeIds = useMemo(
    () =>
      new Set(unresolvedExtensions.map((extension) => extension._recipe?.id)),
    [unresolvedExtensions]
  );

  const allExtensions = useMemo(() => {
    const inactiveExtensions =
      cloudExtensions.data
        ?.filter((x) => !installedExtensionIds.has(x.id))
        .map((x) => ({ ...x, active: false })) ?? [];

    return [...unresolvedExtensions, ...inactiveExtensions];
  }, [cloudExtensions.data, installedExtensionIds, unresolvedExtensions]);

  const [
    resolvedExtensions,
    resolvedExtensionsIsLoading,
    resolveError,
    ,
  ] = useAsyncState(
    async () =>
      Promise.all(
        allExtensions.map(async (extension) => resolveDefinitions(extension))
      ),
    [allExtensions],
    []
  );

  const isActive = useCallback(
    (extensionOrRecipe: RecipeDefinition | ResolvedExtension) => {
      if ("_recipe" in extensionOrRecipe) {
        return installedExtensionIds.has(extensionOrRecipe.id);
      }

      return installedRecipeIds.has(extensionOrRecipe.metadata.id);
    },
    [installedExtensionIds, installedRecipeIds]
  );

  const personalOrTeamBlueprints = useMemo(
    () =>
      (recipes.data ?? [])
        .filter(
          (recipe) =>
            recipe.metadata.id.includes(scope) ||
            recipe.sharing.organizations.length > 0
        )
        .map((recipe) => ({
          ...recipe,
          active: installedRecipeIds.has(recipe.metadata.id),
        })),
    [recipes.data, scope, installedRecipeIds]
  );

  // Restructures ResolvedExtension | RecipeDefinition into an Installable type
  // TODO: handle "duplicates" i.e. when the recipe and active extension both occur in this list
  const installables = useMemo(
    () =>
      [...resolvedExtensions, ...personalOrTeamBlueprints].map(
        (extensionOrRecipe) => ({
          ...extensionOrRecipe,
          active: isActive(extensionOrRecipe),
          hasUpdate:
            "_recipe" in extensionOrRecipe
              ? updateAvailable(recipes.data, extensionOrRecipe)
              : false,
        })
      ),
    [isActive, personalOrTeamBlueprints, recipes.data, resolvedExtensions]
  );

  return {
    installables: {
      active: installables.filter((installable) => installable.active),
      all: installables,
      personal: installables.filter((installable) =>
        isPersonal(installable, scope)
      ),
      shared: installables.filter(
        (installable) => !isPersonal(installable, scope)
      ),
    },
    isLoading:
      recipes.isLoading ||
      cloudExtensions.isLoading ||
      resolvedExtensionsIsLoading,
    error: cloudExtensions.error ?? recipes.error ?? resolveError,
  };
}

export default useInstallables;
