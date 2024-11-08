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
import { type Nullishable } from "@/utils/nullishUtils";
import { getMe } from "@/data/service/backgroundApi";
import { API_PATHS } from "@/data/service/urlPaths";

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
  expectContext(
    "background",
    "getActiveTheme expects background to use the memoized getMe() method",
  );
  try {
    const client = await getApiClient();
    const [
      { partnerId: managedPartnerId, managedOrganizationId },
      meApiResponse,
      { partnerId: settingsPartnerId },
    ] = await Promise.all([
      // Enterprise managed storage, if provided, always takes precedence over the user's theme settings
      readManagedStorage(),
      getMe(),
      getSettingsState(),
    ]);

    let organizationThemeApiResponse: Nullishable<
      components["schemas"]["OrganizationTheme"]
    > = null;
    if (managedOrganizationId && isUUID(managedOrganizationId)) {
      const { data } = await client.get<
        components["schemas"]["OrganizationTheme"]
      >(
        // Is an unauthenticated endpoint
        API_PATHS.ORGANIZATION_THEME(managedOrganizationId),
      );
      organizationThemeApiResponse = data;
    } else if (meApiResponse.organization?.theme) {
      organizationThemeApiResponse = meApiResponse.organization?.theme;
    }

    const activeThemeName =
      managedPartnerId ??
      meApiResponse.partner?.theme ??
      settingsPartnerId ??
      DEFAULT_THEME;

    return {
      logo: getThemeLogo(activeThemeName),
      showSidebarLogo: organizationThemeApiResponse
        ? Boolean(organizationThemeApiResponse.show_sidebar_logo)
        : true,
      customSidebarLogo: organizationThemeApiResponse?.logo || null,
      toolbarIcon: organizationThemeApiResponse?.toolbar_icon || null,
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
