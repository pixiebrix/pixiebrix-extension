/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { IconConfig } from "@/core";

export default async function getSvgIcon({
  library = "bootstrap",
  id = "box",
  size = 14,
  color = "#ae87e8",
}: Partial<IconConfig> = {}): Promise<string> {
  const { icons } = await import(
    /* webpackChunkName: "iconLibrary" */ "@/icons/list"
  );

  const libraryCache = icons.get(library);
  if (!libraryCache) {
    throw new Error(`Unknown icon library: ${library}`);
  }

  const iconUrl = libraryCache.get(id) ?? libraryCache.get("box");
  if (!iconUrl) {
    throw new Error(`Could not find icon ${id} in icon library ${library}`);
  }

  const response = await fetch(iconUrl);
  const svgText = await response.text();

  return $(svgText)
    .filter("svg") // There might also be comment nodes, so they need to be filtered out
    .attr({
      width: size,
      height: size,
      fill: color,
    })
    .get(0).outerHTML;
}
