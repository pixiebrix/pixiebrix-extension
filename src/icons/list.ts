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

function getIconMap(resolve: RequireContext): Map<string, string> {
  const resolveId = resolve.id.toString();

  // The resolveId type can theoretically be a number (see __WebpackModuleApi.ModuleId).
  // Haven't seen this in practice but want to include this check in case this comes up.
  // If so, we probably want to pass the library name as an argument to this function.
  if (Number.isNaN(resolveId)) {
    throw new TypeError(`Invalid resolveId: ${resolveId}`);
  }

  const isBootstrapIcons = resolveId.includes("bootstrap-icons");
  const isSimpleIcons = resolveId.includes("simple-icons");

  const icons = new Map<string, string>();
  for (const url of resolve.keys()) {
    const iconFilename = url.split("/").pop();
    const iconName = iconFilename.replace(".svg", "");

    let iconUrl;
    if (isBootstrapIcons) {
      iconUrl = getCDNUrl({
        library: "bootstrap-icons",
        iconFilename,
      });
    } else if (isSimpleIcons) {
      iconUrl = getCDNUrl({
        library: "simple-icons",
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
  getIconMap(require.context("bootstrap-icons/icons/", false, /\.svg$/))
);
icons.set(
  "simple-icons",
  getIconMap(require.context("simple-icons/icons/", false, /\.svg$/))
);
icons.set(
  "custom",
  getIconMap(require.context("@/icons/custom-icons/", false, /\.svg$/))
);
