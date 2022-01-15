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

import { UUID } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import { useContext, useMemo } from "react";
import AuthContext from "@/auth/AuthContext";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/options/selectors";
import useFetch from "@/hooks/useFetch";
import { CloudExtension } from "@/types/contract";
import { useAsyncState } from "@/hooks/common";
import { resolveDefinitions } from "@/registry/internal";
import { isPersonalBrick } from "@/options/pages/installed/ActiveBricksCard";
import {
  Installable,
  isPersonal,
} from "@/options/pages/blueprints/installableUtils";

function useInstallables(): {
  blueprints: {
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

  const {
    data: rawRecipes,
    isLoading: isRecipesLoading,
    error: recipeError,
  } = useFetch<RecipeDefinition[]>("/api/recipes/");

  const {
    data: cloudExtensions,
    isLoading: isCloudExtensionsLoading,
    error: cloudError,
  } = useFetch<CloudExtension[]>("/api/extensions");

  const allExtensions = useMemo(() => {
    const installedExtensionIds = new Set<UUID>(
      unresolvedExtensions.map((extension) => extension.id)
    );

    const inactiveExtensions =
      cloudExtensions
        ?.filter((x) => !installedExtensionIds.has(x.id))
        .map((x) => ({ ...x, active: false })) ?? [];

    return [...unresolvedExtensions, ...inactiveExtensions];
  }, [cloudExtensions, unresolvedExtensions]);

  const [resolvedExtensions, , resolveError] = useAsyncState(
    async () =>
      Promise.all(
        allExtensions.map(async (extension) => resolveDefinitions(extension))
      ),
    [allExtensions],
    null
  );

  const activeExtensions = useMemo(
    () => resolvedExtensions?.filter((extension) => extension.active),
    [resolvedExtensions]
  );

  const personalOrTeamBlueprints = useMemo(() => {
    const installedRecipes = new Set(
      unresolvedExtensions.map((extension) => extension._recipe?.id)
    );

    return (rawRecipes ?? [])
      .filter(
        (recipe) =>
          recipe.metadata.id.includes(scope) ||
          recipe.sharing.organizations.length > 0
      )
      .map((recipe) => ({
        ...recipe,
        active: installedRecipes.has(recipe.metadata.id),
      }));
  }, [unresolvedExtensions, rawRecipes, scope]);

  return {
    blueprints: {
      active: activeExtensions,
      all: [...(resolvedExtensions ?? []), ...personalOrTeamBlueprints],
      personal: [
        ...(resolvedExtensions ?? []).filter((extension) =>
          isPersonal(extension)
        ),
        ...personalOrTeamBlueprints.filter((blueprint) =>
          blueprint.metadata.id.includes(scope)
        ),
      ],
      shared: personalOrTeamBlueprints.filter(
        (blueprint) => !blueprint.metadata.id.includes(scope)
      ),
    },
    isLoading:
      isRecipesLoading ||
      isCloudExtensionsLoading ||
      resolvedExtensions === null,
    error: cloudError ?? recipeError ?? resolveError,
  };
}

export default useInstallables;
