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
const filenameRegex = /^\.\/(?<fileName>.*?)\.svg$/i;

export type IconLibrary = "bootstrap" | "simple-icons";

const iconCache: { [libraryKey in IconLibrary]: { [key: string]: string } } = {
  bootstrap: {},
  "simple-icons": {},
};

function importAll(library: IconLibrary, r: any): void {
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

export interface IconConfig {
  id: string;
  library?: IconLibrary;
  size?: number;
}

export interface IconOption {
  value: { id: string; library: IconLibrary };
  label: string;
}

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
  $elt.find("path").attr("fill", "#ae87e8");

  return $elt.get(0).outerHTML;
}

export default iconAsSVG;
