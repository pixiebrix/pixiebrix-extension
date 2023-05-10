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

import { type UUID } from "@/types/stringTypes";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { resolveExtensionInnerDefinitions } from "@/registry/internal";
import { type Installable, type UnavailableRecipe } from "./blueprintsTypes";
import { useGetAllCloudExtensionsQuery } from "@/services/api";
import { selectScope } from "@/auth/authSelectors";
import { useAllRecipes } from "@/recipes/recipesHooks";
import { uniqBy } from "lodash";
import useAsyncState from "@/hooks/useAsyncState";

type InstallablesState = {
  /**
   * The installables fetched/generated so far. There's no loading/fetching state. `useInstallables` just adds entries
   * as they become available.
   */
  installables: Installable[];
  /**
   * An error that occurred while fetching/generating installables, or undefined.
   */
  error: unknown;
};

/**
 * React Hook returning `Installable`s, a common abstraction for recipes and un-packaged IExtensions.
 * @see Installable
 */
function useInstallables(): InstallablesState {
  const scope = useSelector(selectScope);
  const unresolvedExtensions = useSelector(selectExtensions);

  const { data: knownRecipes, ...recipesState } = useAllRecipes();
  const cloudExtensions = useGetAllCloudExtensionsQuery();

  const { installedExtensionIds, installedRecipeIds } = useMemo(
    () => ({
      installedExtensionIds: new Set<UUID>(
        unresolvedExtensions.map((extension) => extension.id)
      ),
      installedRecipeIds: new Set(
        unresolvedExtensions.map((extension) => extension._recipe?.id)
      ),
    }),
    [unresolvedExtensions]
  );

  const knownPersonalOrTeamRecipes = useMemo(
    () =>
      (knownRecipes ?? []).filter(
        (recipe) =>
          // Is personal blueprint
          recipe.metadata.id.includes(scope) ||
          // Is blueprint shared with user
          recipe.sharing.organizations.length > 0 ||
          // Is blueprint active, e.g. installed via marketplace
          installedRecipeIds.has(recipe.metadata.id)
      ),
    [installedRecipeIds, knownRecipes, scope]
  );

  const allExtensions = useMemo(() => {
    const inactiveExtensions =
      cloudExtensions.data
        ?.filter((x) => !installedExtensionIds.has(x.id))
        .map((x) => ({ ...x, active: false })) ?? [];

    return [...unresolvedExtensions, ...inactiveExtensions];
  }, [cloudExtensions.data, installedExtensionIds, unresolvedExtensions]);

  const { data: resolvedExtensions, isError: resolveError } = useAsyncState(
    async () =>
      Promise.all(
        allExtensions.map(async (extension) =>
          resolveExtensionInnerDefinitions(extension)
        )
      ),
    [allExtensions],
    { initialValue: [] }
  );

  const extensionsWithoutRecipe = useMemo(
    () =>
      // `resolvedExtensions` can be undefined if resolveDefinitions errors above
      (resolvedExtensions ?? []).filter((extension) =>
        extension._recipe?.id
          ? !installedRecipeIds.has(extension._recipe?.id)
          : true
      ),
    [installedRecipeIds, resolvedExtensions]
  );

  const unknownRecipes: UnavailableRecipe[] = useMemo(() => {
    const knownRecipeIds = new Set(
      (knownRecipes ?? []).map((x) => x.metadata.id)
    );

    // `resolvedExtensions` can be undefined if resolveDefinitions errors above
    const unavailable = (resolvedExtensions ?? []).filter(
      (extension) =>
        extension._recipe?.id && !knownRecipeIds.has(extension._recipe?.id)
    );

    // Show one entry per missing recipe
    return uniqBy(
      unavailable.map((x) => ({
        metadata: x._recipe,
        kind: "recipe",
        isStub: true,
        updated_at: x._recipe.updated_at,
        sharing: x._recipe.sharing,
      })),
      (x) => x.metadata.id
    );
  }, [knownRecipes, resolvedExtensions]);

  return {
    installables: [
      ...extensionsWithoutRecipe,
      ...knownPersonalOrTeamRecipes,
      ...unknownRecipes,
    ],
    error: cloudExtensions.error ?? recipesState.error ?? resolveError,
  };
}

export default useInstallables;
