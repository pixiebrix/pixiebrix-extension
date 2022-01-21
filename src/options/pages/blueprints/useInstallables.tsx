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

import { ResolvedExtension, Sharing, UUID } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import { useCallback, useContext, useMemo } from "react";
import AuthContext from "@/auth/AuthContext";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useAsyncState } from "@/hooks/common";
import { resolveDefinitions } from "@/registry/internal";
import {
  getSharing,
  Installable,
  isPersonal,
  updateAvailable,
} from "@/options/pages/blueprints/installableUtils";
import {
  useGetCloudExtensionsQuery,
  useGetOrganizationsQuery,
  useGetRecipesQuery,
} from "@/services/api";
import { Organization } from "@/types/contract";

type InstallableGroup = {
  groupName: string;
  installables: Installable[];
};

type GroupedInstallables = InstallableGroup[];

type GroupByFunction = (installables: Installable[]) => GroupedInstallables;

type GroupByUtilities = {
  team: GroupByFunction;
  scope: GroupByFunction;
  active: GroupByFunction;
};

type InstallablesState = {
  installables: {
    active: Installable[];
    all: Installable[];
    personal: Installable[];
    shared: Installable[];
  };
  // groupByUtilities: GroupByUtilities;
  isLoading: boolean;
  error: unknown;
};

const getOrganization = (
  extensionOrRecipe: ResolvedExtension | RecipeDefinition,
  organizations: Organization[]
) => {
  const sharing = getSharing(extensionOrRecipe);

  if (!sharing || sharing.organizations.length === 0) {
    return null;
  }

  // If more than one sharing organization, use the first
  return organizations.find((org) =>
    sharing.organizations.includes(org.id as UUID)
  );
};

function useInstallables(): InstallablesState {
  const { scope } = useContext(AuthContext);
  const unresolvedExtensions = useSelector(selectExtensions);

  const recipes = useGetRecipesQuery();
  const cloudExtensions = useGetCloudExtensionsQuery();
  const { data: organizations = [] } = useGetOrganizationsQuery();

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
      (recipes.data ?? []).filter(
        (recipe) =>
          recipe.metadata.id.includes(scope) ||
          recipe.sharing.organizations.length > 0
      ),
    [recipes.data, scope]
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
          organization: getOrganization(extensionOrRecipe, organizations),
        })
      ),
    [
      isActive,
      organizations,
      personalOrTeamBlueprints,
      recipes.data,
      resolvedExtensions,
    ]
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
