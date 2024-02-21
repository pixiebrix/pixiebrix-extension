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
  themeStorage,
} from "@/themes/themeUtils";
import { type Me, type OrganizationTheme } from "@/types/contract";
import { getApiClient } from "@/services/apiClient";
import { isUUID } from "@/types/helpers";
import reportError from "@/telemetry/reportError";
import { DEFAULT_THEME } from "@/themes/themeTypes";
import { getSettingsState } from "@/store/settings/settingsStorage";

/**
 * Returns the active theme assets. In React, prefer useTheme.
 * @see useTheme
 */
export async function getActiveTheme(): Promise<ThemeAssets> {
  expectContext("extension");

  // Enterprise managed storage, if provided, always takes precedence over the user's theme settings
  const { partnerId: managedPartnerId, managedOrganizationId } =
    await readManagedStorage();

  const client = await getApiClient();

  try {
    let organizationTheme: OrganizationTheme;
    if (managedOrganizationId && isUUID(managedOrganizationId)) {
      const { data } = await client.get<OrganizationTheme>(
        // Is an unauthenticated endpoint
        `/api/organizations/${managedOrganizationId}/theme/`,
      );
      organizationTheme = data;
    }

    const { data: meData } = await client.get<Me>("/api/me/");
    if (meData.organization?.theme) {
      organizationTheme = meData.organization?.theme;
    }

    // The theme property is initialized/set via an effect in useGetThemeName
    const { theme: themeName } = await getSettingsState();
    const activeThemeName =
      managedPartnerId ?? themeName ?? meData.partner?.theme ?? DEFAULT_THEME;

    const activeThemeAssets = {
      logo: getThemeLogo(activeThemeName),
      showSidebarLogo: organizationTheme
        ? Boolean(organizationTheme.show_sidebar_logo)
        : true,
      customSidebarLogo: organizationTheme?.logo || null,
      toolbarIcon: organizationTheme?.toolbar_icon || null,
      baseThemeName: isValidThemeName(activeThemeName)
        ? activeThemeName
        : DEFAULT_THEME,
    };

    void themeStorage.set(activeThemeAssets);
    return activeThemeAssets;
  } catch (error) {
    reportError(error);
    return {
      logo: getThemeLogo(DEFAULT_THEME),
      showSidebarLogo: true,
      customSidebarLogo: null,
      toolbarIcon: null,
      baseThemeName: DEFAULT_THEME,
    };
  }
}
