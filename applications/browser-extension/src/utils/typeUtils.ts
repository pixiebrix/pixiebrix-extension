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

import { type Primitive } from "type-fest";

/**
 * Returns true if the value is a JS primitive. `null` is considered a primitive.
 * @param value the value to test
 */
export function isPrimitive(value: unknown): value is Primitive {
  if (typeof value === "object") {
    return value == null;
  }

  return typeof value !== "function";
}

/**
 * Convert a string or number value to a boolean.
 * - Considers the following string values to be truthy (case and whitespace insensitive): true, t, yest, y, on, 1
 * - Considers non-zero numbers to be truthy
 */
export function boolean(value: unknown): boolean {
  if (typeof value === "string") {
    return ["true", "t", "yes", "y", "on", "1"].includes(
      value.trim().toLowerCase(),
    );
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return false;
}
