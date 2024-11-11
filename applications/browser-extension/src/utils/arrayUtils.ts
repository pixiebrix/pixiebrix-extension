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

import {
  countBy,
  entries,
  flow,
  head,
  last,
  maxBy,
  partialRight,
} from "lodash";

/**
 * Return the most common element in an array
 * @param items the array of items
 */
export function mostCommonElement<T>(items: T[]): T {
  // https://stackoverflow.com/questions/49731282/the-most-frequent-item-of-an-array-using-lodash
  return flow(countBy, entries, partialRight(maxBy, last), head)(items) as T;
}
