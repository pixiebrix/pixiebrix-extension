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

import setToolbarIconFromTheme from "@/background/setToolbarIconFromTheme";
import { expectContext } from "@/utils/expectContext";
import { getActiveTheme } from "@/themes/themeStore";
import { browserAction } from "@/mv3/api";
import { themeStorage } from "@/themes/themeUtils";
import { allSettled } from "@/utils/promiseUtils";

/**
 * Set the toolbar icon based on the current theme settings.
 */
async function setToolbarIcon(): Promise<void> {
  const cachedTheme = await themeStorage.get();
  // Set initial icon before fetching the activeTheme which may take several seconds to resolve.
  if (cachedTheme) {
    try {
      await setToolbarIconFromTheme(cachedTheme);
    } catch (error) {
      // Likely due to the cached theme using an svg
      console.error("Failed to set toolbar icon from cached theme", error);
    }
  } else {
    // Default to manifest icons (This re-sets the colored manifest icons)
    const { icons: manifestPath } = browser.runtime.getManifest();
    await browserAction.setIcon({ path: manifestPath });
  }

  const activeTheme = await getActiveTheme();

  await allSettled(
    [themeStorage.set(activeTheme), setToolbarIconFromTheme(activeTheme)],
    { catch: "ignore" },
  );
}

export default function initTheme() {
  expectContext("background");

  void setToolbarIcon();
}
