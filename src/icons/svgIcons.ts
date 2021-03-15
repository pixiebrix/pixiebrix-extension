/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import sortBy from "lodash/sortBy";
import { IconOption } from "@/icons/types";
type RequireContext = __WebpackModuleApi.RequireContext;
import { IconLibrary, IconConfig } from "@/core";

const filenameRegex = /^\.\/(?<fileName>.*?)\.svg$/i;

const iconCache: { [libraryKey in IconLibrary]: { [key: string]: string } } = {
  bootstrap: {},
  custom: {},
  "simple-icons": {},
};

function importAll(library: IconLibrary, r: RequireContext): void {
  return r.keys().forEach((key: string) => {
    const match = filenameRegex.exec(key);
    iconCache[library][match.groups.fileName] = r(key);
  });
}

importAll(
  "bootstrap",
  require.context("bootstrap-icons/icons/", false, /\.svg$/)
);

importAll(
  "simple-icons",
  require.context("simple-icons/icons/", false, /\.svg$/)
);

importAll("custom", require.context("@/icons/custom-icons/", false, /\.svg$/));

export const iconOptions: IconOption[] = sortBy(
  Object.entries(iconCache).flatMap(([library, libraryCache]) =>
    Object.keys(libraryCache).map((id) => ({
      value: { library, id } as { library: IconLibrary; id: string },
      label: id,
    }))
  ),
  (x) => x.label
);

function iconAsSVG(config: IconConfig): string {
  const library = iconCache[config.library ?? "bootstrap"];

  if (!library) {
    throw new Error(`Unknown icon library: ${config.library}`);
  }

  const $elt = $(library[config.id] ?? library["box"]);

  if (!$elt.length) {
    throw new Error(
      `Could not find icon ${config.id} in icon library ${library}`
    );
  }

  $elt.attr("width", config.size ?? 14);
  $elt.attr("height", config.size ?? 14);
  $elt.find("path").attr("fill", config.color ?? "#ae87e8");

  return $elt.get(0).outerHTML;
}

export default iconAsSVG;
