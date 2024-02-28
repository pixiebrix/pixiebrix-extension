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

import { readManagedStorage } from "@/store/enterprise/managedStorage";
import { expectContext } from "@/utils/expectContext";
import {
  getThemeLogo,
  isValidThemeName,
  type ThemeAssets,
} from "@/themes/themeUtils";
import { isUUID } from "@/types/helpers";
import { getApiClient } from "@/data/service/apiClient";
import reportError from "@/telemetry/reportError";
import { DEFAULT_THEME } from "@/themes/themeTypes";
import { getSettingsState } from "@/store/settings/settingsStorage";
import type { components } from "@/types/swagger";
import {
  type OrganizationTheme,
  transformOrganizationThemeResponse,
} from "@/data/model/OrganizationTheme";
import { type Me, transformMeResponse } from "@/data/model/Me";
import { type Nullishable } from "@/utils/nullishUtils";

export const initialTheme: ThemeAssets = {
  logo: getThemeLogo(DEFAULT_THEME),
  showSidebarLogo: true,
  customSidebarLogo: null,
  toolbarIcon: null,
  themeName: DEFAULT_THEME,
  lastFetched: null,
};

/**
 * Returns the active theme assets based on a few different sources.
 * In order of preference we use information from:
 * - The managed storage defined organization and partnerId
 * - The user's (`me` endpoint) primary organization and partnerId
 * - The user's local settings
 * - The default theme
 *
 * The value for the active theme is cached in `themeStorage`.
 *
 * In React components, prefer useTheme.
 * @see useTheme
 */
export async function getActiveTheme(): Promise<ThemeAssets> {
  expectContext("extension");
  try {
    const client = await getApiClient();
    const [
      { partnerId: managedPartnerId, managedOrganizationId },
      { data: meResponse },
      { partnerId: settingsPartnerId },
    ] = await Promise.all([
      // Enterprise managed storage, if provided, always takes precedence over the user's theme settings
      readManagedStorage(),
      client.get<components["schemas"]["Me"]>("/api/me/"),
      getSettingsState(),
    ]);

    const meData: Me = transformMeResponse(meResponse);

    let organizationTheme: Nullishable<OrganizationTheme> = null;
    if (managedOrganizationId && isUUID(managedOrganizationId)) {
      const { data } = await client.get<
        components["schemas"]["OrganizationTheme"]
      >(
        // Is an unauthenticated endpoint
        `/api/organizations/${managedOrganizationId}/theme/`,
      );
      organizationTheme = transformOrganizationThemeResponse(data);
    } else if (meData.primaryOrganization?.organizationTheme) {
      organizationTheme = meData.primaryOrganization?.organizationTheme;
    }

    const activeThemeName =
      managedPartnerId ??
      meData.partner?.partnerTheme ??
      settingsPartnerId ??
      DEFAULT_THEME;

    return {
      logo: getThemeLogo(activeThemeName),
      showSidebarLogo: organizationTheme
        ? Boolean(organizationTheme.showSidebarHeaderLogo)
        : true,
      customSidebarLogo: organizationTheme?.logoUrl?.href || null,
      toolbarIcon: organizationTheme?.toolbarIconUrl?.href || null,
      themeName: isValidThemeName(activeThemeName)
        ? activeThemeName
        : DEFAULT_THEME,
      lastFetched: Date.now(),
    };
  } catch (error) {
    reportError(error);
    return initialTheme;
  }
}
