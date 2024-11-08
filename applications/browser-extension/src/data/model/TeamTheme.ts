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

import { canParseUrl } from "../../utils/urlUtils";
import { type RequiredMeTeamThemeResponse } from "../service/responseTypeHelpers";

export type TeamTheme = {
  /**
   * Whether to show the team logo in the sidebar header.
   */
  showSidebarHeaderLogo: boolean;
  /**
   * The theme's custom logo URL.
   */
  logoUrl?: URL;
  /**
   * The URL for the theme's custom browser toolbar icon. Image format is svg/
   */
  toolbarIconUrl?: URL;
};

export function transformTeamThemeResponse(
  response: RequiredMeTeamThemeResponse,
): TeamTheme {
  const theme: TeamTheme = {
    showSidebarHeaderLogo: response.show_sidebar_logo ?? true,
  };

  if (canParseUrl(response.logo)) {
    theme.logoUrl = new URL(response.logo);
  }

  if (canParseUrl(response.toolbar_icon)) {
    theme.toolbarIconUrl = new URL(response.toolbar_icon);
  }

  return theme;
}
