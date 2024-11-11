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

// eslint-disable-next-line local-rules/preferNullishable, local-rules/preferNullish -- All roads lead here
export type Nullish = null | undefined;

// eslint-disable-next-line local-rules/preferNullishable -- All roads lead here
export type Nullishable<T> = T | Nullish;

/**
 * Throw a TypeError if the value is null or undefined.
 * @param value the value to check
 * @param assertionMessage TypeError message to throw if the value is null or undefined
 * @see assumeNotNullish_UNSAFE
 */
export function assertNotNullish<T>(
  value: T,
  assertionMessage: string,
): asserts value is NonNullable<T> {
  if (value == null) {
    throw new TypeError(assertionMessage);
  }
}

/**
 * Assume value is not nullish without actually checking the value.
 * This is equivalent to `@ts-expect-error` but it works with our dual-tsconfig setup.
 *
 * @see assertNotNullish
 */
export function assumeNotNullish_UNSAFE<T>(
  _value: T,
): asserts _value is Exclude<T, Nullish> {}
