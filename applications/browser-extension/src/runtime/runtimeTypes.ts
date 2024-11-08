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

import { type BrickConfig } from "@/bricks/types";
import { type Brick } from "@/types/brickTypes";
import {
  type BrickArgs,
  type OutputKey,
  VARIABLE_REFERENCE_PREFIX,
} from "@/types/runtimeTypes";
import { type ValueOf } from "type-fest";

export const BrickTypes = {
  READER: "reader",
  EFFECT: "effect",
  TRANSFORM: "transform",
  RENDERER: "renderer",
} as const;

export type BrickType = ValueOf<typeof BrickTypes>;

/**
 * A block configuration with the corresponding resolved Brick and BrickType.
 * @see BrickConfig
 * @see BrickType
 */
export type ResolvedBrickConfig = {
  brick: Brick;
  config: BrickConfig;
  type: BrickType | null;
};

/**
 * Assume that a value matches the expected arg for any brick.
 *
 * For use in tests and JavaScript bricks that manually create a call to an individual brick.
 *
 * @see brickOptionsFactory
 */
export function unsafeAssumeValidArg<T extends UnknownObject>(
  value: unknown,
): BrickArgs<T> {
  return value as BrickArgs<T>;
}

const OUTPUT_KEY_REGEX = /^[A-Z_a-z]\w{0,30}$/;

/**
 * Validates and returns if `key` is a valid brick output key (i.e., variable name), or throws a TypeError.
 */
export function validateOutputKey(key: string): OutputKey {
  if (OUTPUT_KEY_REGEX.test(key)) {
    return key as OutputKey;
  }

  throw new TypeError("Not a valid output key");
}

/**
 * Type guard for OutputKey
 */
export function isOutputKey(value: unknown): value is OutputKey {
  return typeof value === "string" && OUTPUT_KEY_REGEX.test(value);
}

/**
 * Returns a reference to the given output key. Currently, this is just the output key prefixed with `@`.
 */
export function getOutputReference(outputKey: OutputKey): string {
  return VARIABLE_REFERENCE_PREFIX + outputKey;
}
