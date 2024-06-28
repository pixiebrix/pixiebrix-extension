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

import { type UUID } from "@/types/stringTypes";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import { hydrateModComponentInnerDefinitions } from "@/registry/hydrateInnerDefinitions";
import { useGetAllStandaloneModDefinitionsQuery } from "@/data/service/api";
import { selectScope } from "@/auth/authSelectors";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { uniqBy } from "lodash";
import useAsyncState from "@/hooks/useAsyncState";
import { type ModComponentBase } from "@/types/modComponentTypes";
import type { Mod, UnavailableMod } from "@/types/modTypes";
import { DefinitionKinds } from "@/types/registryTypes";

type ModsState = {
  /**
   * The mods fetched/generated so far. There's no loading/fetching state. `useMods` just adds entries
   * as they become available.
   */
  mods: Mod[];
  /**
   * An error that occurred while fetching/generating mods, or undefined.
   */
  error: unknown;
};

export function unavailableModFactory(
  modComponent: ModComponentBase,
): UnavailableMod {
  return {
    metadata: modComponent._recipe,
    kind: DefinitionKinds.MOD,
    isStub: true,
    updated_at: modComponent._recipe.updated_at,
    sharing: modComponent._recipe.sharing,
  };
}

/**
 * React Hook for consolidating Mods.
 * @see Mod
 */
function useMods(): ModsState {
  const scope = useSelector(selectScope);
  const unresolvedExtensions = useSelector(selectActivatedModComponents);

  const { data: knownRecipes, ...recipesState } = useAllModDefinitions();
  const standaloneModDefinitions = useGetAllStandaloneModDefinitionsQuery();

  const { installedExtensionIds, installedRecipeIds } = useMemo(
    () => ({
      installedExtensionIds: new Set<UUID>(
        unresolvedExtensions.map((extension) => extension.id),
      ),
      installedRecipeIds: new Set(
        unresolvedExtensions.map((extension) => extension._recipe?.id),
      ),
    }),
    [unresolvedExtensions],
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
          installedRecipeIds.has(recipe.metadata.id),
      ),
    [installedRecipeIds, knownRecipes, scope],
  );

  const allExtensions = useMemo(() => {
    const inactiveExtensions =
      standaloneModDefinitions.data
        ?.filter((x) => !installedExtensionIds.has(x.id))
        .map((x) => ({ ...x, active: false })) ?? [];

    return [...unresolvedExtensions, ...inactiveExtensions];
  }, [
    standaloneModDefinitions.data,
    installedExtensionIds,
    unresolvedExtensions,
  ]);

  const { data: resolvedExtensions, error: resolveError } = useAsyncState(
    async () =>
      Promise.all(
        allExtensions.map(async (extension) =>
          hydrateModComponentInnerDefinitions(extension),
        ),
      ),
    [allExtensions],
    { initialValue: [] },
  );

  const extensionsWithoutRecipe = useMemo(
    () =>
      // `resolvedExtensions` can be undefined if resolveDefinitions errors above
      (resolvedExtensions ?? []).filter((extension) =>
        extension._recipe?.id
          ? !installedRecipeIds.has(extension._recipe?.id)
          : true,
      ),
    [installedRecipeIds, resolvedExtensions],
  );

  // Find extensions that were installed by a recipe that's no longer available to the user, e.g., because it was
  // deleted, or because the user no longer has access to it.
  const unavailableRecipes: UnavailableMod[] = useMemo(() => {
    const knownRecipeIds = new Set(
      (knownRecipes ?? []).map((x) => x.metadata.id),
    );

    // `resolvedExtensions` can be undefined if resolveDefinitions errors above
    const unavailable = (resolvedExtensions ?? []).filter(
      (extension) =>
        extension._recipe?.id && !knownRecipeIds.has(extension._recipe?.id),
    );

    // Show one entry per missing recipe
    return uniqBy(
      unavailable.map((x) => unavailableModFactory(x)),
      (x) => x.metadata.id,
    );
  }, [knownRecipes, resolvedExtensions]);

  return {
    mods: [
      ...extensionsWithoutRecipe,
      ...knownPersonalOrTeamRecipes,
      ...unavailableRecipes,
    ],
    error: standaloneModDefinitions.error ?? recipesState.error ?? resolveError,
  };
}

export default useMods;
