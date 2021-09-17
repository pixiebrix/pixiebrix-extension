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
/* eslint-disable import/export -- These are overrides, it's on purpose */

// eslint-disable-next-line no-restricted-imports -- The node_modules path is to avoid self-references due to webpack alias to this file
export * from "../../node_modules/webext-detect-page";

export function isExtensionContext() {
  // Enables static analysis and removal of dead code
  return true;
}
