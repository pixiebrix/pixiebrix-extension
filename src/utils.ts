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

/**
 * @file Generic helper methods.
 */

import {
  compact,
  countBy,
  entries,
  flow,
  head,
  isEmpty,
  isPlainObject,
  last,
  mapValues,
  maxBy,
  negate,
  ObjectIterator,
  partial,
  partialRight,
  pickBy,
  split,
  unary,
  zip,
} from "lodash";
import { JsonObject, Primitive } from "type-fest";
import { ApiVersion, RegistryId, SafeString } from "@/core";
import { UnknownObject } from "@/types";
import { RecipeDefinition } from "@/types/definitions";
import safeJsonStringify from "json-stringify-safe";

const specialCharsRegex = /[.[\]]/;

/**
 * Create a Formik field name, validating the individual path parts.
 * @param baseFieldName The base field name
 * @param rest the other Formik field name path parts
 * @throws Error if a path part is invalid
 */
export function joinName(
  baseFieldName: string | null,
  ...rest: string[]
): string {
  const fieldNames = compact(rest);

  if (fieldNames.length === 0) {
    throw new Error(
      "Expected one or more field names to join with the main path"
    );
  }

  let path = baseFieldName || "";
  for (const fieldName of fieldNames) {
    if (specialCharsRegex.test(fieldName)) {
      path += `["${fieldName}"]`;
    } else if (path === "") {
      path = fieldName;
    } else {
      path += `.${fieldName}`;
    }
  }

  return path;
}

export function mostCommonElement<T>(items: T[]): T {
  // https://stackoverflow.com/questions/49731282/the-most-frequent-item-of-an-array-using-lodash
  return flow(countBy, entries, partialRight(maxBy, last), head)(items) as T;
}

export function isGetter(obj: Record<string, unknown>, prop: string): boolean {
  return Boolean(Object.getOwnPropertyDescriptor(obj, prop)?.get);
}

/**
 * Return all property names (including non-enumerable) in the prototype hierarchy.
 */
export function getAllPropertyNames(obj: Record<string, unknown>): string[] {
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

export async function waitAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
}

/**
 * Returns a new object with all the values from the original resolved
 */
export async function resolveObj<T>(
  obj: Record<string, Promise<T>>
): Promise<Record<string, T>> {
  return Object.fromEntries(
    await Promise.all(Object.entries(obj).map(async ([k, v]) => [k, await v]))
  );
}

/**
 * Same as lodash mapValues but supports promises
 */
export async function asyncMapValues<T, TResult>(
  mapping: T,
  fn: ObjectIterator<T, Promise<TResult>>
): Promise<{ [K in keyof T]: TResult }> {
  const entries = Object.entries(mapping);
  const values = await Promise.all(
    entries.map(async ([key, value]) => fn(value, key, mapping))
  );
  return Object.fromEntries(
    zip(entries, values).map(([[key], value]) => [key, value])
  ) as any;
}

export const sleep = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export class TimeoutError extends Error {
  override name = "TimeoutError";
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
  const start = Date.now();
  let value: T;
  do {
    value = valueFactory();
    if (predicate(value)) {
      return value;
    }

    // eslint-disable-next-line no-await-in-loop -- intentionally blocking the loop
    await sleep(retryMillis);
  } while (Date.now() - start < waitMillis);

  throw new TimeoutError(`Value not found after ${waitMillis} milliseconds`);
}

export function isPrimitive(value: unknown): value is Primitive {
  if (typeof value === "object") {
    return value === null;
  }

  return typeof value !== "function";
}

/**
 * Recursively pick entries that match a predicate
 * @param obj an object
 * @param predicate predicate returns true to include an entry
 * @see pickBy
 */
export function deepPickBy(
  obj: unknown,
  predicate: (value: unknown, parent?: unknown) => boolean
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
      (value) => deepPickBy(value, predicate)
    );
  }

  return obj;
}

export function removeUndefined(obj: unknown): unknown {
  return deepPickBy(obj, (value: unknown) => typeof value !== "undefined");
}

export function boolean(value: unknown): boolean {
  if (typeof value === "string") {
    return ["true", "t", "yes", "y", "on", "1"].includes(
      value.trim().toLowerCase()
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

export function clone<T extends Record<string, unknown>>(object: T): T {
  return Object.assign(Object.create(null), object);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value && typeof value === "object";
}

export function ensureJsonObject(value: Record<string, unknown>): JsonObject {
  if (!isObject(value)) {
    throw new TypeError("expected object");
  }

  return JSON.parse(safeJsonStringify(value)) as JsonObject;
}

export function clearObject(obj: Record<string, unknown>): void {
  for (const member in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, member)) {
      // Checking to ensure own property
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection
      delete obj[member];
    }
  }
}

/**
 * Set values to undefined that can't be sent across the boundary between the host site context and the
 * content script context
 */
export function cleanValue(
  value: unknown[],
  maxDepth?: number | undefined,
  depth?: number
): unknown[];
export function cleanValue(
  value: Record<string, unknown>,
  maxDepth?: number | undefined,
  depth?: number
): Record<string, unknown>;
export function cleanValue(
  value: unknown,
  maxDepth?: number | undefined,
  depth?: number
): unknown;
export function cleanValue(
  value: unknown,
  maxDepth: number | undefined,
  depth = 0
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

/**
 * Error indicating input elements to a block did not match the schema.
 */
export class InvalidPathError extends Error {
  override name = "InvalidPathError";

  public readonly path: string;

  readonly input: unknown;

  constructor(message: string, path: string) {
    super(message);
    this.path = path;
  }
}

export function isNullOrBlank(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  return typeof value === "string" && value.trim() === "";
}

export function excludeUndefined(obj: unknown): unknown {
  if (isPlainObject(obj) && typeof obj === "object") {
    return mapValues(
      pickBy(obj, (x) => x !== undefined),
      excludeUndefined
    );
  }

  return obj;
}

export function evaluableFunction(
  function_: (...parameters: unknown[]) => unknown
): string {
  return "(" + function_.toString() + ")()";
}

/**
 * Lift a unary function to pass through null/undefined.
 */
export function optional<T extends (arg: unknown) => unknown>(
  fn: T
): (arg: null | Parameters<T>[0]) => ReturnType<T> | null {
  return (arg: Parameters<T>[0]) => {
    if (arg == null) {
      return null;
    }

    return fn(arg) as ReturnType<T>;
  };
}

/**
 * Returns true if `url` is an absolute URL, based on whether the URL contains a schema
 */
export function isAbsoluteUrl(url: string): boolean {
  return /(^|:)\/\//.test(url);
}

export const SPACE_ENCODED_VALUE = "%20";

// Preserve the previous default for backwards compatibility
// https://github.com/pixiebrix/pixiebrix-extension/pull/3076#discussion_r844564894
export const LEGACY_URL_INPUT_SPACE_ENCODING_DEFAULT = "plus";
export const URL_INPUT_SPACE_ENCODING_DEFAULT = "percent";

export function makeURL(
  url: string,
  params: Record<string, string | number | boolean> = {},
  spaceEncoding: "plus" | "percent" = URL_INPUT_SPACE_ENCODING_DEFAULT
): string {
  // https://javascript.info/url#searchparams
  const result = new URL(url, location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (isNullOrBlank(value)) {
      result.searchParams.delete(key);
    } else {
      result.searchParams.set(key, String(value));
    }
  }

  if (spaceEncoding === "percent" && result.search.length > 0) {
    result.search = result.search.replaceAll("+", SPACE_ENCODED_VALUE);
  }

  return result.href;
}

export async function allSettledValues<T = unknown>(
  promises: Array<Promise<T>>
): Promise<T[]> {
  const settled = await Promise.allSettled(promises);
  return settled
    .filter(
      (promise): promise is PromiseFulfilledResult<Awaited<T>> =>
        promise.status === "fulfilled"
    )
    .map(({ value }) => value);
}

export function freshIdentifier(
  root: SafeString,
  identifiers: string[],
  options: { includeFirstNumber?: boolean; startNumber?: number } = {}
): string {
  const { includeFirstNumber, startNumber } = {
    includeFirstNumber: false,
    startNumber: 1,
    ...options,
  };

  // eslint-disable-next-line security/detect-non-literal-regexp -- guarding with SafeString
  const regexp = new RegExp(`^${root}(?<number>\\d+)$`);

  const used = identifiers
    .map((identifier) =>
      identifier === root ? startNumber : regexp.exec(identifier)?.groups.number
    )
    .filter((x) => x != null)
    .map(Number);
  const next = Math.max(startNumber - 1, ...used) + 1;

  if (next === startNumber && !includeFirstNumber) {
    return root;
  }

  return `${root}${next}`;
}

/** Like `new URL(url)` except it never throws and always returns an URL object, empty if the url is invalid */
export function safeParseUrl(url: string, baseUrl?: string): URL {
  try {
    return new URL(url, baseUrl);
  } catch {
    return new URL("invalid-url://");
  }
}

export function isApiVersionAtLeast(
  is: ApiVersion,
  atLeast: ApiVersion
): boolean {
  const isNum = Number(is.slice(1));
  const atLeastNum = Number(atLeast.slice(1));

  return isNum >= atLeastNum;
}

export function getProperty(obj: UnknownObject, property: string) {
  if (Object.prototype.hasOwnProperty.call(obj, property)) {
    // Checking for hasOwnProperty
    // eslint-disable-next-line security/detect-object-injection
    return obj[property];
  }
}

export async function runInMillis<TResult>(
  factory: () => Promise<TResult>,
  maxMillis: number
): Promise<TResult> {
  const timeout = Symbol("timeout");
  const value = await Promise.race([
    factory(),
    sleep(maxMillis).then(() => timeout),
  ]);

  if (value === timeout) {
    throw new TimeoutError(`Method did not complete in ${maxMillis}ms`);
  }

  return value as TResult;
}

/** Loop an iterable with the ability to place `await` in the loop itself */
export async function asyncForEach<Item>(
  iterable: Iterable<Item>,
  iteratee: (item: Item) => Promise<void>
): Promise<void> {
  await Promise.all([...iterable].map(unary(iteratee)));
}

export async function waitFor<T>(
  looper: (...args: unknown[]) => Promise<T> | T,
  { maxWaitMillis = Number.MAX_SAFE_INTEGER, intervalMillis = 100 }
): Promise<T | undefined> {
  const endBy = Date.now() + maxWaitMillis;
  do {
    // eslint-disable-next-line no-await-in-loop -- It's a retry loop
    const result = await looper();
    if (result) {
      return result;
    }

    // eslint-disable-next-line no-await-in-loop -- It's a retry loop
    await sleep(intervalMillis);
  } while (Date.now() < endBy);
}

export function isMac(): boolean {
  // https://stackoverflow.com/a/27862868/402560
  return navigator.platform.includes("Mac");
}

/** Tests a target string against a list of strings (full match) or regexes (can be mixed) */
export function matchesAnyPattern(
  target: string,
  patterns: Array<string | RegExp | ((x: string) => boolean)>
): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === "string") {
      return pattern === target;
    }

    if (typeof pattern === "function") {
      return pattern(target);
    }

    return pattern.test(target);
  });
}

// Enables highlighting/prettifying when used as html`<div>` or css`.a {}`
// https://prettier.io/blog/2020/08/24/2.1.0.html
function concatenateTemplateLiteralTag(
  strings: TemplateStringsArray,
  ...keys: string[]
): string {
  return strings
    .map((string, i) => string + (i < keys.length ? keys[i] : ""))
    .join("");
}

export const html = concatenateTemplateLiteralTag;
export const css = concatenateTemplateLiteralTag;

export function getRecipeById(
  recipes: RecipeDefinition[],
  id: RegistryId
): RecipeDefinition | undefined {
  return recipes.find((recipe) => recipe.metadata.id === id);
}

/**
 * Splits a value into a scope and id, based on scope starting with @ and id
 *  as everything following the first / character
 * @param value the full RegistryId
 */
export function getScopeAndId(
  value: RegistryId
): [string | undefined, string | undefined] {
  // Scope needs to start with @
  if (!value.startsWith("@")) {
    return [undefined, value];
  }

  // If the value starts with @ and doesn't have a slash, interpret it as a scope
  if (!value.includes("/")) {
    return [value, undefined];
  }

  const [scope, ...idParts] = split(value, "/");
  return [scope, idParts.join("/")];
}

const punctuation = [...".,;:?!"];
const wrappers = ["'", '"'];
/**
 * Appends a period to a string as long as it doesn't end with one.
 * Considers quotes and parens and it always trims the trailing spaces.
 */
export function smartAppendPeriod(string: string): string {
  const trimmed = string.trimEnd();
  const [secondLastChar, lastChar] = trimmed.slice(-2);
  if (punctuation.includes(lastChar) || punctuation.includes(secondLastChar)) {
    // Already punctuated
    return trimmed;
  }

  // Else: No punctuation, find where to place it

  if (lastChar === '"' || lastChar === "'") {
    return trimmed.slice(0, -1) + "." + lastChar;
  }

  return trimmed + ".";
}
