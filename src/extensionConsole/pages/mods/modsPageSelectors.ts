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
import { RESTRICTED_PREFIX } from "@/hooks/useFlags";
import buildModsList from "@/extensionConsole/pages/mods/utils/buildModsList";
import buildGetModActivationStatus from "@/extensionConsole/pages/mods/utils/buildGetModActivationStatus";
import buildGetModVersionStatus from "@/extensionConsole/pages/mods/utils/buildGetModVersionStatus";
import buildGetModSharingSource from "@/extensionConsole/pages/mods/utils/buildGetModSharingSource";
import buildGetCanEditModScope from "@/extensionConsole/pages/mods/utils/buildGetCanEditModScope";
import { buildModViewItems } from "@/extensionConsole/pages/mods/utils/buildModViewItems";

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

const selectActivatedModIds = createSelector(
  selectActivatedModComponents,
  (activatedModComponents) =>
    new Set(activatedModComponents.map(({ _recipe }) => _recipe?.id)),
);

export const selectModsList = createSelector(
  selectScope,
  selectActivatedModComponents,
  selectAllModDefinitions,
  selectActivatedModIds,
  buildModsList,
);

const selectGetModActivationStatus = createSelector(
  selectActivatedModComponents,
  buildGetModActivationStatus,
);

const selectGetModVersionStatus = createSelector(
  selectActivatedModComponents,
  buildGetModVersionStatus,
);

const selectModsPageUserPermissions = createSelector(
  appApi.endpoints.getFeatureFlags.select(),
  ({ data: featureFlags }) => {
    // Don't allow if flags have not loaded
    if (featureFlags == null) {
      return {
        canPublish: false,
        canDeactivate: false,
        canEditInWorkshop: false,
      };
    }

    return {
      canPublish: featureFlags.includes("publish-to-marketplace"),
      canDeactivate: !featureFlags.includes(`${RESTRICTED_PREFIX}-uninstall`),
      canEditInWorkshop: featureFlags.includes("workshop"),
    };
  },
);

const selectGetModSharingSource = createSelector(
  selectScope,
  selectOrganizations,
  selectActivatedModComponents,
  buildGetModSharingSource,
);

const selectCanEditModScope = createSelector(
  selectScope,
  selectOrganizations,
  buildGetCanEditModScope,
);

export const selectModViewItems = createSelector(
  selectModsList,
  selectGetModActivationStatus,
  selectGetModVersionStatus,
  selectGetModSharingSource,
  selectCanEditModScope,
  selectModsPageUserPermissions,
  appApi.endpoints.getMarketplaceListings.select(),
  appApi.endpoints.getEditablePackages.select(),
  (
    mods,
    getActivationStatus,
    getVersionStatus,
    getSharingSource,
    getCanEditModScope,
    userPermissions,
    { data: listings = {} },
    { data: editablePackages = [] },
    // eslint-disable-next-line max-params -- Can't make a selector have an inputs object
  ) =>
    buildModViewItems({
      mods,
      getActivationStatus,
      getVersionStatus,
      getSharingSource,
      getCanEditModScope,
      userPermissions,
      listings,
      editablePackages,
    }),
);
