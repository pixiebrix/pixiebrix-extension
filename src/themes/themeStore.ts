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

import { getSettingsState } from "@/store/settings/settingsStorage";
import { readManagedStorage } from "@/store/enterprise/managedStorage";
import { expectContext } from "@/utils/expectContext";
import { DEFAULT_THEME, type ThemeName } from "@/themes/themeTypes";
import { isValidThemeName } from "@/themes/themeUtils";
import { type Me, type OrganizationTheme } from "@/types/contract";
import { getApiClient } from "@/data/service/apiClient";
import { validateUUID } from "@/types/helpers";
import { type Nullishable } from "@/utils/nullishUtils";
import reportError from "@/telemetry/reportError";

async function getOrganizationTheme(
  organizationId: Nullishable<string>,
): Promise<OrganizationTheme> {
  try {
    const client = await getApiClient();
    if (organizationId) {
      const orgUUID = validateUUID(organizationId);
      return await client
        .get(
          // Is an unauthenticated endpoint
          `/api/organizations/${orgUUID}/theme/`,
        )
        .json<OrganizationTheme>();
    }

    const data = await client.get("/api/me/").json<Me>();
    return data.organization?.theme;
  } catch (error) {
    reportError(error);
    return { show_sidebar_logo: true, logo: null, toolbar_icon: null };
  }
}

/**
 * Returns the active theme settings. In React, prefer useTheme.
 * @see useTheme
 */
export async function getActiveTheme(): Promise<{
  themeName: ThemeName;
  toolbarIcon: Nullishable<string>;
}> {
  expectContext("extension");

  // The theme property is initialized/set via an effect in useGetThemeName
  // TODO: refactor this so it's instead fetched here once on init.
  const { theme } = await getSettingsState();
  const { partnerId: managedPartnerId, managedOrganizationId } =
    await readManagedStorage();

  const organizationTheme = await getOrganizationTheme(managedOrganizationId);

  // Enterprise managed storage, if provided, always takes precedence over the user's theme settings
  const active = managedPartnerId ?? theme;

  const themeName = isValidThemeName(active) ? active : DEFAULT_THEME;

  return { themeName, toolbarIcon: organizationTheme?.toolbar_icon };
}
