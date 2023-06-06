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

/* eslint-disable unicorn/prefer-module -- There's no module equivalent to require.context */

import { type IconLibrary } from "@/types/iconTypes";
import bootstrapIconsPackage from "bootstrap-icons/package.json";
import simpleIconsPackage from "simple-icons/package.json";

type RequireContext = __WebpackModuleApi.RequireContext;
type CDNIconLibrary = "bootstrap-icons" | "simple-icons";

const CDN_ICON_LIBRARY_VERSIONS: Record<CDNIconLibrary, string> = {
  "bootstrap-icons": bootstrapIconsPackage.version,
  "simple-icons": simpleIconsPackage.version,
};

function getCDNUrl({
  library,
  iconFilename,
}: {
  library: CDNIconLibrary;
  iconFilename: string;
}): string {
  // eslint-disable-next-line security/detect-object-injection
  const version = CDN_ICON_LIBRARY_VERSIONS[library];

  if (!version) {
    throw new Error(`Unknown CDN icon library: ${library}`);
  }

  return `https://cdn.jsdelivr.net/npm/${library}@${version}/icons/${iconFilename}`;
}

// Need to pass in the CDN library name because we can't reliably get the string passed to require.context
function getIconMap(
  resolve: RequireContext,
  cdnLibrary: CDNIconLibrary = null
): Map<string, string> {
  const icons = new Map<string, string>();
  for (const url of resolve.keys()) {
    const iconFilename = url.split("/").pop();
    const iconName = iconFilename.replace(".svg", "");

    let iconUrl;
    if (cdnLibrary) {
      iconUrl = getCDNUrl({
        library: cdnLibrary,
        iconFilename,
      });
    } else {
      iconUrl = resolve(url);
    }

    icons.set(iconName, iconUrl);
  }

  return icons;
}

export const icons = new Map<IconLibrary, Map<string, string>>();
icons.set(
  "bootstrap",
  getIconMap(
    require.context("bootstrap-icons/icons/", false, /\.svg$/),
    "bootstrap-icons"
  )
);
icons.set(
  "simple-icons",
  getIconMap(
    require.context("simple-icons/icons/", false, /\.svg$/),
    "simple-icons"
  )
);
icons.set(
  "custom",
  getIconMap(require.context("@/icons/custom-icons/", false, /\.svg$/))
);
