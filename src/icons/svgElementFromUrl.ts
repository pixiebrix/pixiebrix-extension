/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { browser } from "webextension-polyfill-ts";

export default async function fetchSVG(
  src: string
): Promise<JQuery<SVGElement>> {
  const extensionPrefix = browser.runtime.getURL("/");
  if (!src.startsWith(extensionPrefix)) {
    throw new Error(
      "fetchSVG can only be used to fetch icons bundled with the extension"
    );
  }
  const response = await fetch(src);
  const svg = await response.text();
  // There might also be comment nodes, so they need to be filtered out
  return $<SVGElement>(svg).filter("svg");
}
