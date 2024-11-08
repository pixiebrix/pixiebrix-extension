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

import { $safeFind } from "../../../utils/domUtils";
import { expectContext } from "../../../utils/expectContext";
import Overlay from "../../../vendors/Overlay";

let _overlay: Overlay | null = null;

export async function enableOverlay(selector: string): Promise<void> {
  expectContext("contentScript");

  _overlay ??= new Overlay();

  const elements = $safeFind(selector).toArray();
  if (elements.length > 0) {
    _overlay.inspect(elements);
  }
}

export async function disableOverlay(): Promise<void> {
  expectContext("contentScript");

  _overlay?.remove();
  _overlay = null;
}
