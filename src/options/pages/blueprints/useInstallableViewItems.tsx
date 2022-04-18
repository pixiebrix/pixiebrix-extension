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
  InstallableStatus,
  InstallableViewItem,
} from "@/options/pages/blueprints/blueprintsTypes";
import React, { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { UUID } from "@/core";

import {
  getDescription,
  getInstalledVersionNumber,
  getLabel,
  getPackageId,
  getSharingType,
  getUpdatedAt,
  isDeployment,
  isExtension,
  updateAvailable,
} from "@/options/pages/blueprints/utils/installableUtils";
import {
  useGetMarketplaceListingsQuery,
  useGetRecipesQuery,
} from "@/services/api";
import { MarketplaceListing } from "@/types/contract";
import InstallableIcon from "@/options/pages/blueprints/InstallableIcon";
import { selectOrganizations, selectScope } from "@/auth/authSelectors";
import { isDeploymentActive } from "@/utils/deployment";

function useInstallableViewItems(installables: Installable[]): {
  installableViewItems: InstallableViewItem[];
  isLoading: boolean;
} {
  const scope = useSelector(selectScope);
  const installedExtensions = useSelector(selectExtensions);
  const organizations = useSelector(selectOrganizations);
  const listingsQuery = useGetMarketplaceListingsQuery();
  const recipesQuery = useGetRecipesQuery();

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

        for (const installedExtension of installedExtensions) {
          if (
            installedExtension._recipe?.id === getPackageId(installable) &&
            installedExtension._deployment
          ) {
            return isDeploymentActive(installedExtension) ? "Active" : "Paused";
          }
        }
      }

      return isActive(installable) ? "Active" : "Inactive";
    },
    [installedExtensions, isActive]
  );

  const installableIcon = useCallback(
    (installable: Installable) => {
      const listing: MarketplaceListing | null = listingsQuery.isLoading
        ? null
        : listingsQuery.data[getPackageId(installable)];

      return (
        <InstallableIcon
          listing={listing}
          installable={installable}
          isLoading={listingsQuery.isLoading}
          size={"2x"}
        />
      );
    },
    [listingsQuery]
  );

  const installableViewItems = useMemo(
    () =>
      installables.map((installable) => ({
        name: getLabel(installable),
        description: getDescription(installable),
        sharing: {
          packageId: getPackageId(installable),
          source: getSharingType(
            installable,
            organizations,
            scope,
            installedExtensions
          ),
        },
        updatedAt: getUpdatedAt(installable),
        status: getStatus(installable),
        hasUpdate: updateAvailable(
          recipesQuery.data,
          installedExtensions,
          installable
        ),
        installedVersionNumber: getInstalledVersionNumber(
          installedExtensions,
          installable
        ),
        icon: installableIcon(installable),
        installable,
      })),
    [
      getSharingType,
      getStatus,
      installableIcon,
      installables,
      installedExtensions,
      organizations,
      recipesQuery.data,
      scope,
    ]
  );

  return {
    installableViewItems,
    isLoading: recipesQuery.isLoading || listingsQuery.isLoading,
  };
}

export default useInstallableViewItems;
