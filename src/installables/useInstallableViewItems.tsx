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

import {
  type Installable,
  type InstallableStatus,
  type InstallableViewItem,
} from "@/installables/installableTypes";
import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { type UUID } from "@/types/stringTypes";

import {
  getDescription,
  getInstalledVersionNumber,
  getLabel,
  getPackageId,
  getSharingType,
  getUpdatedAt,
  isDeployment,
  isExtension,
  isUnavailableRecipe,
  updateAvailable,
} from "@/installables/installableUtils";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import { selectOrganizations, selectScope } from "@/auth/authSelectors";
import { isDeploymentActive } from "@/utils/deploymentUtils";
import { useAllRecipes } from "@/recipes/recipesHooks";

function useInstallableViewItems(installables: Installable[]): {
  installableViewItems: readonly InstallableViewItem[];
  isLoading: boolean;
} {
  const scope = useSelector(selectScope);
  const installedExtensions = useSelector(selectExtensions);
  const organizations = useSelector(selectOrganizations);

  // Don't merge async states. Allow hook to render without listings
  const listingsQuery = useGetMarketplaceListingsQuery();
  const { data: recipes, isLoading: isRecipesLoading } = useAllRecipes();

  const { installedExtensionIds, installedRecipeIds } = useMemo(
    () => ({
      installedExtensionIds: new Set<UUID>(
        installedExtensions.map((extension) => extension.id)
      ),
      installedRecipeIds: new Set(
        installedExtensions.map((extension) => extension._recipe?.id)
      ),
    }),
    [installedExtensions]
  );

  const isActive = useCallback(
    (installable: Installable) => {
      if (isExtension(installable)) {
        return installedExtensionIds.has(installable.id);
      }

      return installedRecipeIds.has(installable.metadata.id);
    },
    [installedExtensionIds, installedRecipeIds]
  );

  const getStatus = useCallback(
    (installable: Installable): InstallableStatus => {
      if (isDeployment(installable, installedExtensions)) {
        if (isExtension(installable)) {
          return isDeploymentActive(installable) ? "Active" : "Paused";
        }

        const deploymentExtension = installedExtensions.find(
          (installedExtension) =>
            installedExtension._recipe?.id === getPackageId(installable) &&
            installedExtension._deployment
        );

        return isDeploymentActive(deploymentExtension) ? "Active" : "Paused";
      }

      return isActive(installable) ? "Active" : "Inactive";
    },
    [installedExtensions, isActive]
  );

  const installableViewItems = useMemo(() => {
    // Load to map for fast lookup if you have a lot of recipes. Could put in its own memo
    const recipeMap = new Map(
      (recipes ?? []).map((recipe) => [recipe.metadata.id, recipe])
    );

    // Pick any IExtension from the blueprint to check for updates. All of their versions should be the same.
    const extensionsMap = new Map(
      installedExtensions
        .filter((x) => x._recipe?.id)
        .map((extension) => [extension._recipe.id, extension])
    );

    return installables.map((installable) => {
      const packageId = getPackageId(installable);

      return {
        name: getLabel(installable),
        description: getDescription(installable),
        sharing: {
          packageId,
          source: getSharingType({
            installable,
            organizations,
            scope,
            installedExtensions,
          }),
          // eslint-disable-next-line security/detect-object-injection -- packageId is a registry id
          listingId: listingsQuery.data?.[packageId]?.id,
        },
        updatedAt: getUpdatedAt(installable),
        status: getStatus(installable),
        hasUpdate: updateAvailable(recipeMap, extensionsMap, installable),
        installedVersionNumber: getInstalledVersionNumber(
          installedExtensions,
          installable
        ),
        unavailable: isUnavailableRecipe(installable),
        installable,
      } satisfies InstallableViewItem;
    });
  }, [
    getStatus,
    installables,
    installedExtensions,
    listingsQuery,
    organizations,
    recipes,
    scope,
  ]);

  return {
    installableViewItems,
    // Don't wait for the marketplace listings to load. They're only used to determine the icon and sharing options.
    // FIXME: when the marketplace data loads, it causes a re-render because the data is passed to React Table. So if
    //  the user had a 3-dot menu open for one of the installables, it will close. This is a bit jarring.
    isLoading: isRecipesLoading,
  };
}

export default useInstallableViewItems;
