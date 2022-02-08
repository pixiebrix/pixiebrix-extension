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

import {
  Installable,
  InstallableViewItem,
} from "@/options/pages/blueprints/blueprintsTypes";
import React, { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { ResolvedExtension, UUID } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import {
  getDescription,
  getLabel,
  getPackageId,
  getSharingType,
  getUpdatedAt,
  isExtension,
  updateAvailable,
} from "@/options/pages/blueprints/installableUtils";
import {
  useGetAuthQuery,
  useGetMarketplaceListingsQuery,
  useGetOrganizationsQuery,
  useGetRecipesQuery,
} from "@/services/api";
import { MarketplaceListing } from "@/types/contract";
import InstallableIcon from "@/options/pages/blueprints/InstallableIcon";

function useInstallableViewItems(
  installables: Installable[]
): InstallableViewItem[] {
  const {
    data: { scope },
  } = useGetAuthQuery();
  const installedExtensions = useSelector(selectExtensions);
  const organizations = useGetOrganizationsQuery();
  const listings = useGetMarketplaceListingsQuery();
  const recipes = useGetRecipesQuery();

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
    (extensionOrRecipe: RecipeDefinition | ResolvedExtension) => {
      if ("_recipe" in extensionOrRecipe) {
        return installedExtensionIds.has(extensionOrRecipe.id);
      }

      return installedRecipeIds.has(extensionOrRecipe.metadata.id);
    },
    [installedExtensionIds, installedRecipeIds]
  );

  const installableIcon = useCallback(
    (installable: Installable) => {
      const listing: MarketplaceListing | null = listings.isLoading
        ? null
        : listings.data[getPackageId(installable)];

      return (
        <InstallableIcon
          listing={listing}
          installable={installable}
          isLoading={listings.isLoading}
          size={"2x"}
        />
      );
    },
    [listings]
  );

  return useMemo(
    () =>
      installables.map((installable) => ({
        name: getLabel(installable),
        description: getDescription(installable),
        sharing: {
          packageId: getPackageId(installable),
          source: getSharingType(installable, organizations.data, scope),
        },
        updatedAt: getUpdatedAt(installable),
        status: isActive(installable) ? "Active" : "Uninstalled",
        hasUpdate: isExtension(installable)
          ? updateAvailable(recipes.data, installable)
          : false,
        icon: installableIcon(installable),
        installable,
      })),
    [
      installableIcon,
      installables,
      isActive,
      organizations,
      recipes.data,
      scope,
    ]
  );
}

export default useInstallableViewItems;
