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

/**
 * @file file for selector inference utilities that are independent of hints
 * 1.8.2 introduced so hints could reference utilities without introducing a cycle
 */

/**
 * Generates a regex to test attribute selectors generated by `css-selector-generator`,
 * to be used in the allow/deny list arrays. The regex will match any selector with or
 * without a value specified: `[attr]`, `[attr='value']`
 * @example getAttributeSelectorRegex('name', 'aria-label')
 * @returns /^\[name(=|]$)|^\[aria-label(=|]$)/
 */
export function getAttributeSelectorRegex(...attributes: string[]): RegExp {
  // eslint-disable-next-line security/detect-non-literal-regexp -- Not user-provided
  return new RegExp(
    attributes.map((attribute) => `^\\[${attribute}(=|]$)`).join("|"),
  );
}
