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

type KeyGetter<T> = ((obj: T) => string) | keyof T;

/**
 * Create lookup map from an array of objects
 * @param arrToMap - array to make into a map
 * @param keyOrGetter - either a key or function to get the value we use as a key
 *
 * @example
 * const people = [
 *     { name: 'John', age: 30 },
 *     { name: 'Jane', age: 25 },
 *     { name: 'Steve', age: 40 }
 * ];
 *
 * const nameLookup = createLookupMap(people, 'name');
 *
 * console.log(nameLookup.get('John')); // Outputs: { name: 'John', age: 30 }
 */

export function createLookupMap<T>(
  array: T[],
  keyOrGetter: KeyGetter<T>
): Map<string, T> {
  const lookupMap = new Map<string, T>();

  for (const item of array) {
    const key =
      typeof keyOrGetter === "function"
        ? (keyOrGetter as (obj: T) => string)(item)
        : String(item[keyOrGetter]);

    lookupMap.set(key, item);
  }

  return lookupMap;
}
