/* eslint-disable security/detect-object-injection -- That's the whole purpose of this file */
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

export function hasOwnProp(
  object: Record<string, unknown>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function getOwnProp<T>(
  object: Record<string, T>,
  key: string
): T | undefined {
  if (hasOwnProp(object, key)) {
    return object[key];
  }
}

export function setOwnProp<T>(
  object: Record<string, T>,
  key: string,
  value: T
): void {
  // If it exists, it must be its own property
  // It it doesn't exist in the prototype, it's good
  if (key in object === hasOwnProp(object, key)) {
    object[key] = value;
  }
}
