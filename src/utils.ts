/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
  isEmpty,
  mapValues,
  partial,
  partialRight,
  negate,
  identity,
  countBy,
  maxBy,
  entries,
  last,
  flow,
  head,
  ObjectIterator,
  fromPairs,
  zip,
  pickBy,
} from "lodash";
import { Primitive } from "type-fest";

export function mostCommonElement<T>(items: T[]): T {
  // https://stackoverflow.com/questions/49731282/the-most-frequent-item-of-an-array-using-lodash
  return flow(countBy, entries, partialRight(maxBy, last), head)(items) as T;
}

export function isGetter(obj: object, prop: string): boolean {
  return !!Object.getOwnPropertyDescriptor(obj, prop)?.["get"];
}

/**
 * Return all property names (including non-enumerable) in the prototype hierarchy.
 */
export function getAllPropertyNames(obj: object): string[] {
  const props = new Set<string>();
  let current = obj;
  while (current) {
    for (const name of Object.getOwnPropertyNames(current)) {
      props.add(name);
    }
    current = Object.getPrototypeOf(current);
  }
  return Array.from(props.values());
}

export async function waitAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

/**
 * Same as lodash mapValues but supports promises
 */
export async function asyncMapValues<T, TResult>(
  mapping: T,
  func: ObjectIterator<T, Promise<TResult>>
): Promise<{ [K in keyof T]: TResult }> {
  const entries = Object.entries(mapping);
  const values = await Promise.all(
    entries.map(([key, value]) => func(value, key, mapping))
  );
  return fromPairs(
    zip(entries, values).map(([[key], value]) => [key, value])
  ) as any;
}

export const sleep = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export async function awaitValue<T>(
  valueFactory: () => T,
  {
    waitMillis,
    retryMillis = 50,
    predicate = negate(isEmpty),
  }: {
    waitMillis: number;
    retryMillis?: number;
    predicate?: (value: T) => boolean;
  }
): Promise<T> {
  const start = new Date().getTime();
  let value: T;
  do {
    value = valueFactory();
    if (predicate(value)) {
      return value;
    }
    await sleep(retryMillis);
  } while (new Date().getTime() - start < waitMillis);

  throw new TimeoutError(`Value not found after ${waitMillis} milliseconds`);
}

export function isPrimitive(val: unknown): val is Primitive {
  if (typeof val === "object") {
    return val === null;
  }
  return typeof val !== "function";
}

export function removeUndefined(obj: unknown): unknown {
  if (obj === undefined) {
    return null;
  } else if (Array.isArray(obj)) {
    return obj.map((x) => removeUndefined(x));
  } else if (typeof obj === "object") {
    return mapValues(
      pickBy(obj, (x) => x !== undefined),
      (x) => removeUndefined(x)
    );
  } else {
    return obj;
  }
}

export function boolean(value: unknown): boolean {
  if (typeof value === "string") {
    return ["true", "t", "yes", "y", "on", "1"].includes(
      value.trim().toLowerCase()
    );
  } else if (typeof value === "number") {
    return value !== 0;
  } else if (typeof value === "boolean") {
    return value;
  }
  return false;
}

export function clone<T extends {}>(object: T): T {
  return Object.assign(Object.create(null), object);
}

export function clearObject(obj: { [key: string]: unknown }): void {
  for (const member in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, member)) {
      delete obj[member];
    }
  }
}

export function castFunction(valueOrFunction: Function): Function;
export function castFunction(valueOrFunction: any): () => any {
  return typeof valueOrFunction === "function"
    ? valueOrFunction
    : () => valueOrFunction;
}

/**
 * Set values to undefined that can't be sent across the boundary between the host site context and the
 * content script context
 */
export function cleanValue(
  value: unknown[],
  maxDepth?: number,
  depth?: number
): unknown[];
export function cleanValue(
  value: {
    [key: string]: unknown;
  },
  maxDepth?: number,
  depth?: number
): { [key: string]: unknown };
export function cleanValue(
  value: unknown,
  maxDepth?: number,
  depth?: number
): unknown;
export function cleanValue(value: unknown, maxDepth = 5, depth = 0): unknown {
  const recurse = partial(cleanValue, partial.placeholder, maxDepth, depth + 1);

  if (depth > maxDepth) {
    return undefined;
  } else if (Array.isArray(value)) {
    return value.map(recurse);
  } else if (typeof value === "object" && value != null) {
    return mapValues(value, recurse);
  } else if (typeof value === "function" || typeof value === "symbol") {
    return undefined;
  } else {
    return value;
  }
}

/**
 * Error indicating input elements to a block did not match the schema.
 */
export class InvalidPathError extends Error {
  public readonly path: string;
  readonly input: unknown;

  constructor(message: string, path: string) {
    super(message);
    this.name = "InvalidPathError";
    this.path = path;
  }
}

export interface ReadProxy {
  toJS: (value: unknown) => unknown;
  get: (value: unknown, prop: number | string) => unknown;
}

export const noopProxy: ReadProxy = {
  toJS: identity,
  get: (value, prop) => (value as any)[prop],
};

export function getPropByPath(
  obj: { [prop: string]: unknown },
  path: string,
  {
    args = {},
    proxy = noopProxy,
  }: { args?: object; proxy?: ReadProxy } | undefined = {}
): unknown {
  // consider using jsonpath syntax https://www.npmjs.com/package/jsonpath

  const { toJS = noopProxy.toJS, get = noopProxy.get } = proxy;

  let value: unknown = obj;
  const rawParts = path.trim().split(".");

  for (const [index, rawPart] of rawParts.entries()) {
    const previous = value;

    // handle null coalescing syntax
    let part: string | number = rawPart;
    let coalesce = false;
    let numeric = false;

    if (rawPart.endsWith("?")) {
      part = rawPart.slice(0, -1);
      coalesce = true;
    }

    if (part.match(/^\d+$/) && Array.isArray(value)) {
      part = parseInt(part, 0);
      numeric = true;
    }

    if (!(typeof value == "object" || (Array.isArray(previous) && numeric))) {
      throw new InvalidPathError(`Invalid path ${path}`, path);
    }

    value = get(value, part);

    if (value == null) {
      if (coalesce || index === rawParts.length - 1) {
        return null;
      } else {
        throw new InvalidPathError(`${path} undefined (missing ${part})`, path);
      }
    }

    if (typeof value === "function") {
      try {
        value = value.apply(previous, args);
      } catch (exc) {
        throw new Error(`Error running method ${part}: ${exc}`);
      }
    }
  }

  return cleanValue(toJS(value));
}

export function isNullOrBlank(value: unknown): boolean {
  if (value == null) {
    return true;
  } else if (typeof value === "string" && value.trim() === "") {
    return true;
  } else {
    return false;
  }
}

export class PromiseCancelled extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromiseCancelled";
  }
}

/**
 * Creates a new promise that's rejected if isCancelled returns true.
 * @throws PromiseCancelled
 */
export async function rejectOnCancelled<T>(
  promise: Promise<T>,
  isCancelled: () => boolean
): Promise<T> {
  let rv: T;
  try {
    rv = await promise;
  } catch (err) {
    if (isCancelled()) {
      throw new PromiseCancelled("Promise was cancelled");
    }
    throw err;
  }
  if (isCancelled()) {
    throw new PromiseCancelled("Promise was cancelled");
  }
  return rv;
}
