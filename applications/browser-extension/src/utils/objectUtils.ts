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

import { type JsonObject } from "type-fest";
import safeJsonStringify from "json-stringify-safe";
import { isPlainObject, mapValues, partial, pickBy } from "lodash";

/**
 * Return all property names (including non-enumerable) in the prototype hierarchy.
 */
export function getAllPropertyNames(obj: UnknownObject): string[] {
  const props = new Set<string>();
  let current = obj;
  while (current) {
    for (const name of Object.getOwnPropertyNames(current)) {
      props.add(name);
    }

    current = Object.getPrototypeOf(current);
  }

  return [...props.values()];
}

/**
 * Recursively pick entries that match a predicate
 * @param obj an object
 * @param predicate predicate returns true to include an entry
 * @see pickBy
 */
export function deepPickBy(
  obj: unknown,
  predicate: (value: unknown, parent?: unknown) => boolean,
): unknown {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#typeof_null
  // `typeof null === "object"`, so have to check for it before the "object" check below
  if (obj == null) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepPickBy(item, predicate));
  }

  if (typeof obj === "object") {
    return mapValues(
      pickBy(obj, (value) => predicate(value, obj)),
      (value) => deepPickBy(value, predicate),
    );
  }

  return obj;
}

/**
 * Returns true if value is non-null and has a typeof "object". Also returns true for arrays.
 * @see assertObject
 */
export function isObject(value: unknown): value is UnknownObject {
  return Boolean(value) && typeof value === "object";
}

/**
 * Asserts that the value is an object or an array
 * @see isObject
 */
export function assertObject(
  value: unknown,
  ErrorCtor: new (...args: unknown[]) => Error = TypeError,
): asserts value is UnknownObject {
  if (!isObject(value)) {
    throw new ErrorCtor("expected object");
  }
}

/**
 * @throws {TypeError} if the value is not an object
 */
export function ensureJsonObject(value: UnknownObject): JsonObject {
  assertObject(value);
  return JSON.parse(safeJsonStringify(value)) as JsonObject;
}

export function getProperty<TResult = unknown>(
  obj: UnknownObject,
  property: string,
): TResult | undefined {
  if (Object.hasOwn(obj, property)) {
    // eslint-disable-next-line security/detect-object-injection -- Checking for hasOwn
    return obj[property] as TResult;
  }
}

/**
 * Set values to undefined that can't be sent across the boundary between the host site context and the
 * content script context
 */
export function cleanValue(
  value: unknown[],
  maxDepth?: number | undefined,
  depth?: number,
): unknown[];
export function cleanValue(
  value: UnknownObject,
  maxDepth?: number | undefined,
  depth?: number,
): UnknownObject;
export function cleanValue(
  value: unknown,
  maxDepth?: number | undefined,
  depth?: number,
): unknown;
export function cleanValue(
  value: unknown,
  maxDepth: number | undefined,
  depth = 0,
): unknown {
  const recurse = partial(cleanValue, partial.placeholder, maxDepth, depth + 1);

  if (maxDepth != null && depth > maxDepth) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((x) => recurse(x));
  }

  if (typeof value === "object" && value != null) {
    return mapValues(value, recurse);
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  return value;
}

export function excludeUndefined(obj: unknown): unknown {
  // This must specifically be `isPlainObject` or else it fails in many situations
  if (isPlainObject(obj) && typeof obj === "object") {
    return mapValues(
      pickBy(obj, (x) => x !== undefined),
      excludeUndefined,
    );
  }

  return obj;
}

export function removeUndefined(obj: unknown): unknown {
  return deepPickBy(obj, (value: unknown) => value !== undefined);
}

export function mapObject<Input, Output>(
  obj: Record<string, Input>,
  fn: (value: Input, key: string) => Output,
): Record<string, Output> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v, k)]));
}

/** Loose type guard for "tables" accepted by `dataTable` and `exportCsv` */
export function isUnknownObjectArray(value: unknown): value is UnknownObject[] {
  return Array.isArray(value) && value.every((element) => isObject(element));
}

/**
 * Type helper for Object.freeze. Note that this only freezes the top level of the object.
 * @see Object.freeze
 */
export function freeze<T>(value: T): T {
  // Consider supporting deep freeze a la: https://www.npmjs.com/package/deep-freeze-strict
  return Object.freeze(value);
}
