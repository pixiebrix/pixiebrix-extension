/* eslint-disable security/detect-object-injection, @typescript-eslint/no-dynamic-delete -- That's the whole purpose of this file */
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

export function hasOwnProp<Key extends string | number>(
  object: Partial<Record<Key, unknown>>,
  key: Key
): boolean {
  return object != null && Object.prototype.hasOwnProperty.call(object, key);
}

// TODO: Accept `unknown` without breaking the Value type for non-unknown objects
//  Maybe start here: https://stackoverflow.com/a/66418421/288906
export function getOwnProp<Key extends string | number, Value>(
  object: Partial<Record<Key, Value>>,
  key: Key
): Value | undefined {
  if (process.env.DEBUG && Array.isArray(object)) {
    console.warn("Use [1, 2, 3].at(index) instead of getOwnProp for arrays");
  }

  if (hasOwnProp(object, key)) {
    return object[key];
  }
}

export function setOwnProp<
  Key extends string | number,
  TObject extends Partial<Record<Key, unknown>>,
  Value extends TObject[Key]
>(object: TObject, key: Key, value: Value): void {
  // If it exists, it must be its own property
  // It it doesn't exist in the prototype, it's good
  if (key in object === hasOwnProp(object, key)) {
    object[key] = value;
  }
}

export function unsetOwnProp<Key extends string | number, Value>(
  object: Partial<Record<Key, Value>>,
  key: Key
): void {
  if (hasOwnProp(object, key)) {
    delete object[key];
  }
}
