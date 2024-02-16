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

import { getThemeLogo } from "@/themes/themeUtils";
import activateBrowserActionIcon from "@/background/activateBrowserActionIcon";
import { DEFAULT_THEME } from "@/themes/themeTypes";
import { expectContext } from "@/utils/expectContext";
import { getActiveTheme } from "@/themes/themeStore";

/**
 * Set the toolbar icon based on the current theme.
 * @see useGetTheme
 */
async function setToolbarIcon(): Promise<void> {
  const activeTheme = await getActiveTheme();

  if (activeTheme === DEFAULT_THEME) {
    // Not necessary. If the theme is ever unset, just reload the extension to reset the icon.
    return;
  }

  const themeLogo = getThemeLogo(activeTheme);
  await activateBrowserActionIcon(themeLogo.small);
}

export default function initPartnerTheme() {
  expectContext("background");

  void setToolbarIcon();
}
