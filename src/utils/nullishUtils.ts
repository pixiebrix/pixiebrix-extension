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

export type Nullish = null | undefined;

export type Maybe<T> = T | Nullish;

export type Optional<T> = T | undefined;

export type Nullable<T> = T | null;

// Inspired by: https://itnext.io/typescript-isnullish-nonnullish-and-assertnonnullish-557deb6e8b17
export const isNullish = <T>(value: T | Nullish): value is Nullish =>
  value == null;

export const isNonNullish = <T>(value: T | Nullish): value is T =>
  !isNullish(value);

export function assertNonNullish<T>(
  value: T,
  assertionMessage: string,
): asserts value is Exclude<T, null | undefined> {
  if (value == null) {
    throw new TypeError(assertionMessage);
  }
}
