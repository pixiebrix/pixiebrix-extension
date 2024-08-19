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

import { type ModsPageState } from "@/extensionConsole/pages/mods/modsPageSlice";
import { createSelector } from "@reduxjs/toolkit";
import { selectAllModDefinitions } from "@/modDefinitions/modDefinitionsSelectors";
import { appApi } from "@/data/service/api";
import { selectOrganizations, selectScope } from "@/auth/authSelectors";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import { type Mod, type ModViewItem } from "@/types/modTypes";
import { uniqBy } from "lodash";
import {
  getSharingSource,
  idHasScope,
  isUnavailableMod,
  mapModComponentToUnavailableMod,
} from "@/utils/modUtils";
import * as semver from "semver";
import { assertNotNullish } from "@/utils/nullishUtils";
import { MARKETPLACE_URL } from "@/urlConstants";
import { getScopeAndId } from "@/utils/registryUtils";
import { isPackageEditorRole } from "@/auth/authUtils";

export type ModsPageRootState = {
  modsPage: ModsPageState;
};

export const selectView = ({ modsPage }: ModsPageRootState) => modsPage.view;
export const selectGroupBy = ({ modsPage }: ModsPageRootState) =>
  modsPage.groupBy;
export const selectSortBy = ({ modsPage }: ModsPageRootState) =>
  modsPage.sortBy;
export const selectActiveTab = ({ modsPage }: ModsPageRootState) =>
  modsPage.activeTab;
export const selectSearchQuery = ({ modsPage }: ModsPageRootState) =>
  modsPage.searchQuery;

export const selectModViewItems = createSelector(
  selectScope,
  selectActivatedModComponents,
  selectAllModDefinitions,
  selectOrganizations,
  appApi.endpoints.getMarketplaceListings.select(),
  appApi.endpoints.getFeatureFlags.select(),
  appApi.endpoints.getEditablePackages.select(),
  (
    userScope,
    activatedModComponents,
    { data: modDefinitions },
    organizations,
    { data: listings },
    { data: featureFlags },
    { data: editablePackages },
    // eslint-disable-next-line max-params -- Needed for selector
  ) => {
    const mods: Mod[] = [];

    if (!modDefinitions || modDefinitions.length === 0) {
      return [] as ModViewItem[];
    }

    const activatedModIds = new Set(
      activatedModComponents.map(({ _recipe }) => _recipe?.id),
    );

    const knownPersonalOrTeamModDefinitions = modDefinitions.filter(
      ({ metadata: { id }, sharing }) =>
        // Is personal mod
        idHasScope(id, userScope) ||
        // Is mod shared with the current user
        sharing.organizations.length > 0 ||
        // Is mod active, e.g. activated via marketplace
        activatedModIds.has(id),
    );

    mods.push(...knownPersonalOrTeamModDefinitions);

    const knownModIds = new Set(
      knownPersonalOrTeamModDefinitions.map(({ metadata }) => metadata.id),
    );

    // Find mod components that were activated by a mod definitions that's no longer available to the user, e.g.,
    // because it was deleted, or because the user no longer has access to it.
    const unavailableModComponents = activatedModComponents.filter(
      (modComponents) => !knownModIds.has(modComponents._recipe?.id),
    );

    const unavailableMods = uniqBy(
      unavailableModComponents,
      ({ _recipe }) => _recipe?.id,
    ).map((modComponent) => mapModComponentToUnavailableMod(modComponent));

    mods.push(...unavailableMods);

    const getStatus = (mod: Mod) => {
      if (activatedModIds.has(mod.metadata.id)) {
        return "Active";
      }

      const { _deployment } = activatedModComponents.find(
        (activatedModComponent) =>
          activatedModComponent._recipe?.id === mod.metadata.id &&
          activatedModComponent._deployment != null,
      );

      if (!_deployment) {
        return "Inactive";
      }

      if (
        // Check for null/undefined to preserve backward compatability
        // Prior to extension version 1.4.0, there was no `active` field, because there was no ability to pause deployments
        _deployment?.active == null ||
        _deployment.active
      ) {
        return "Active";
      }

      return "Paused";
    };

    const getHasUpdateAndActivatedVersion = (
      mod: Mod,
    ): {
      hasUpdate: boolean;
      activatedModVersion: string;
    } => {
      const metadataFromActivatedModComponent = activatedModComponents.find(
        ({ _recipe }) => _recipe?.id === mod.metadata.id,
      )?._recipe;

      assertNotNullish(
        metadataFromActivatedModComponent,
        "Found component without mod metadata!",
      );

      const {
        version: activatedModVersion,
        updated_at: activatedModUpdatedAt,
      } = metadataFromActivatedModComponent;

      if (isUnavailableMod(mod)) {
        // Unavailable mods are never update-able
        return {
          hasUpdate: false,
          activatedModVersion,
        };
      }

      if (semver.gt(mod.metadata.version, activatedModVersion)) {
        return {
          hasUpdate: true,
          activatedModVersion,
        };
      }

      if (semver.lt(mod.metadata.version, activatedModVersion)) {
        return {
          hasUpdate: false,
          activatedModVersion,
        };
      }

      // Versions are equal, compare updated_at
      const modUpdatedDate = new Date(mod.updated_at);
      const activatedComponentUpdatedDate = new Date(activatedModUpdatedAt);
      return {
        hasUpdate: modUpdatedDate > activatedComponentUpdatedDate,
        activatedModVersion,
      };
    };

    // Don't allow actions until flags have loaded
    const canPublish =
      featureFlags && featureFlags.includes("publish-to-marketplace");
    const canUninstall =
      featureFlags && !featureFlags.includes(`${RESTRICTED_PREFIX}-uninstall`);
    const canEditInWorkshop = featureFlags && featureFlags.includes("workshop");

    return mods.map<ModViewItem>((mod) => {
      const { hasUpdate, activatedModVersion } =
        getHasUpdateAndActivatedVersion(mod);

      const listingId = listings?.[mod.metadata.id]?.id;
      const marketplaceListingUrl = listingId
        ? `${MARKETPLACE_URL}${listingId}/`
        : null;
      const isUnavailable = isUnavailableMod(mod);
      const sharingSource = getSharingSource({
        mod,
        organizations,
        userScope,
        modComponents: activatedModComponents,
      });
      const isDeployment = sharingSource.type === "Deployment";
      const isRestricted = isDeployment && !canUninstall;
      const status = getStatus(mod);
      const isActive = status === "Active" || status === "Paused";
      const canEditModScope =
        sharingSource.type === "Personal" ||
        organizations.some((membership) => {
          const { scope: packageScope } = getScopeAndId(mod.metadata.id);
          return (
            isPackageEditorRole(membership.role) &&
            packageScope &&
            membership.scope === packageScope
          );
        });
      const packageMetadata = editablePackages?.find(
        ({ name }) => name === mod.metadata.id,
      );
      const showEditInWorkshop =
        canEditInWorkshop && packageMetadata != null && canEditModScope;
      const showDelete =
        !isActive && packageMetadata != null && canEditModScope;

      return {
        modId: mod.metadata.id,
        editablePackageId: packageMetadata?.id ?? null,
        marketplaceListingUrl,
        name: mod.metadata.name,
        description: mod.metadata.description,
        sharingSource,
        updatedAt: mod.updated_at,
        status,
        hasUpdate,
        activatedModVersion,
        isUnavailable,
        modActions: {
          showPublishToMarketplace:
            canPublish && listingId == null && !isUnavailable && !isDeployment,
          showViewDetails: marketplaceListingUrl != null,
          showShareWithTeams: !isUnavailable && !isDeployment,
          showViewLogs: isActive,
          showEditInWorkshop,
          showActivate: status === "Inactive",
          showReactivate: isActive && !isRestricted && !isUnavailable,
          showDeactivate: isActive && !isRestricted,
          showDelete,
        },
      };
    });
  },
);
