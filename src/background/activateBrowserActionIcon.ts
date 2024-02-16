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

import { browserAction } from "@/mv3/api";
import { loadImageData } from "@/utils/canvasUtils";

function resetBrowserActionIcon() {
  // This re-sets the colored manifest icons
  const { icons: path } = browser.runtime.getManifest();
  browserAction.setIcon({ path });
}

export default async function activateBrowserActionIcon(url?: string) {
  if (!url) {
    resetBrowserActionIcon();
    return;
  }

  try {
    if (url.startsWith("http")) {
      // External URLs must be loaded first
      browserAction.setIcon({ imageData: await loadImageData(url, 32, 32) });
    } else {
      browserAction.setIcon({ path: url });
    }
  } catch (error) {
    console.error("Failed to load image data for browser action icon.", {
      url,
      error,
    });

    resetBrowserActionIcon();
  }
}
