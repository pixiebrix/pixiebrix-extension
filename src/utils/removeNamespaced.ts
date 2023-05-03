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

export function mapObjectValues(obj: any, mapFn: (value: unknown) => unknown) {
  if (typeof obj !== "object") {
    return obj;
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, mapFn(value)])
  );
}

export function filterObjectValuesByNamespace(obj: unknown, namespace: string) {
  if (typeof obj !== "object") {
    return obj;
  }

  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => {
      console.log(key, !key.startsWith(namespace));
      return !key.startsWith(namespace);
    })
  );
}

export function removeNamespaced<T>(
  objToFilter: T,
  namespace: string,
  depth: number
): T {
  if (typeof objToFilter !== "object" || depth === 0) {
    return objToFilter;
  }

  const filteredObj = filterObjectValuesByNamespace(objToFilter, namespace);

  return mapObjectValues(filteredObj, (value) =>
    removeNamespaced(value, namespace, depth - 1)
  );
}
