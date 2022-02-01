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
/* eslint-disable unicorn/prefer-module -- There's no module equivalent to require.context */

import { IconLibrary } from "@/core";

type RequireContext = __WebpackModuleApi.RequireContext;

function getIconMap(resolve: RequireContext): Map<string, string> {
  const icons = new Map<string, string>();
  for (const url of resolve.keys()) {
    const iconName = url.split("/").pop().replace(".svg", "");
    icons.set(iconName, resolve(url));
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
