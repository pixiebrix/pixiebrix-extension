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

import { browserAction } from "../mv3/api";
import type { ThemeAssets } from "../themes/themeUtils";
import { DEFAULT_THEME } from "../themes/themeTypes";
import { loadImageData } from "../utils/canvasUtils";

export default async function setToolbarIconFromTheme({
  logo,
  toolbarIcon,
  themeName,
}: Pick<ThemeAssets, "logo" | "toolbarIcon" | "themeName">) {
  if (toolbarIcon) {
    try {
      // The icon is shown in 16x16 logical pixels, but we want to make it look
      // good on retina displays too. Also the scaling quality of drawImage() is not great
      // so we the use a larger size and let the browser scale it down with a better algo.
      const imageData = await loadImageData(toolbarIcon, 128, 128);
      await browserAction.setIcon({ imageData });
      return;
    } catch (error) {
      console.error("Failed to load toolbar icon", error);
    }
  }

  if (themeName === DEFAULT_THEME) {
    const { icons: path } = browser.runtime.getManifest();
    await browserAction.setIcon({ path });
  } else {
    await browserAction.setIcon({ path: logo.small });
  }
}
