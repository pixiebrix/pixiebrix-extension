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

import { getSettingsState } from "@/store/settings/settingsStorage";
import { readManagedStorage } from "@/store/enterprise/managedStorage";
import { expectContext } from "@/utils/expectContext";
import { DEFAULT_THEME, type Theme } from "@/themes/themeTypes";
import { isValidTheme } from "@/themes/themeUtils";

/**
 * Returns the active theme. In React, prefer useGetTheme.
 * @see useGetTheme
 */
export async function getActiveTheme(): Promise<Theme> {
  expectContext("extension");

  // The theme property is initialized/set via an effect in useGetTheme
  const { theme } = await getSettingsState();
  const { partnerId: managedPartnerId } = await readManagedStorage();

  // Enterprise managed storage, if provided, always takes precedence over the user's theme settings
  const active = managedPartnerId ?? theme;

  return isValidTheme(active) ? active : DEFAULT_THEME;
}
