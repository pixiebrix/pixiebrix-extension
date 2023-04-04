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

import { getSettingsState } from "@/store/settingsStorage";
import { getThemeLogo } from "@/utils/themeUtils";
import activateBrowserActionIcon from "@/background/activateBrowserActionIcon";
import { DEFAULT_THEME } from "@/options/types";
import { browserAction } from "@/mv3/api";
import { expectContext } from "@/utils/expectContext";
import { readManagedStorage } from "@/store/enterprise/managedStorage";

async function setToolbarIcon(): Promise<void> {
  const { theme } = await getSettingsState();
  const { partnerId: managedPartnerId } = await readManagedStorage();

  const activeTheme = managedPartnerId ?? theme;

  if (activeTheme === DEFAULT_THEME) {
    activateBrowserActionIcon();
    return;
  }

  const themeLogo = getThemeLogo(activeTheme);
  browserAction.setIcon({ path: themeLogo.small });
}

export default function initPartnerTheme() {
  expectContext("background");

  void setToolbarIcon();
}
