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

import { identity, toPath, trimEnd } from "lodash";
import { getErrorMessage } from "@/errors/errorHelpers";
import { cleanValue, isObject } from "@/utils/objectUtils";
import { joinName } from "@/utils/formUtils";

// First part of the path can be global context with a @
const pathRegex = /^(@?[\w-]+\??)(\.[\w-]+\??)*$/;

/**
 * Return true if maybePath refers to a property in ctxt.
 */
export function isSimplePath(maybePath: string, ctxt: UnknownObject): boolean {
  if (!pathRegex.test(maybePath)) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The regex above ensures that `maybePath` is not empty
  const head = maybePath.split(".", 1)[0]!;
  const path = head.endsWith("?") ? head.slice(0, -1) : head;
  return ctxt ? Object.hasOwn(ctxt, path) : false;
}

export interface ReadProxy {
  toJS: (value: unknown) => unknown;
  get: (value: unknown, prop: number | string) => unknown;
}

export const noopProxy: ReadProxy = {
  toJS: identity,
  get(value, prop) {
    if (isObject(value) && Object.hasOwn(value, prop)) {
      // eslint-disable-next-line security/detect-object-injection -- Checking visibility of the property above
      return value[prop];
    }
  },
};

type GetPropOptions = {
  /**
   * Arguments to apply if path refers to a method.
   */
  args?: UnknownObject;
  /**
   * Proxy to navigate/traverse the object. (Default: noopProxy, which only traverses own properties)
   * @see noopProxy
   */
  proxy?: ReadProxy;
  /**
   * Max depth of nested object returned (Used when reading data from stores/caches which have a lot of redundant
   * data, e.g., the EmberJS component cache)
   */
  maxDepth?: number;
};

/**
 * Error indicating input elements to a block did not match the schema.
 */
export class InvalidPathError extends Error {
  override name = "InvalidPathError";

  public readonly path: string;

  constructor(message: string, path: string) {
    super(message);
    this.path = path;
  }
}

export function getPropByPath(
  obj: UnknownObject,
  path: string,
  { args = {}, proxy = noopProxy, maxDepth }: GetPropOptions | undefined = {},
): unknown {
  // Consider using jsonpath syntax https://www.npmjs.com/package/jsonpath-plus

  const { toJS = noopProxy.toJS, get = noopProxy.get } = proxy;

  let value: unknown = obj;
  const rawParts = toPath(path.trim());

  for (const [index, rawPart] of rawParts.entries()) {
    const previous = value;

    // Handle optional chaining syntax, e.g., foo?.bar
    let part: string | number = rawPart;
    let isOptionalChain = false;
    let isNumeric = false;

    if (rawPart.endsWith("?")) {
      part = rawPart.slice(0, -1);
      isOptionalChain = true;
    }

    if (/^\d+$/.test(part) && Array.isArray(value)) {
      part = Number.parseInt(part, 10);
      isNumeric = true;
    }

    if (typeof value !== "object" && !(Array.isArray(previous) && isNumeric)) {
      throw new InvalidPathError(`Invalid path ${path}`, path);
    }

    value = get(value, part);

    if (value == null) {
      if (isOptionalChain || index === rawParts.length - 1) {
        return null;
      }

      throw new InvalidPathError(`${path} undefined (missing ${part})`, path);
    }

    if (typeof value === "function") {
      try {
        value = value.apply(previous, args);
      } catch (error) {
        throw new Error(
          `Error running method ${part}: ${getErrorMessage(error)}`,
        );
      }
    }
  }

  return cleanValue(toJS(value), maxDepth);
}

export function getFieldNamesFromPathString(
  name: string,
): [parentFieldName: string | undefined, fieldName: string] {
  const path = toPath(name);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The path always has at least one item
  const fieldName = path.pop()!;
  const parentFieldName = path.length > 0 ? joinName(null, ...path) : undefined;
  return [parentFieldName, fieldName];
}

/**
 * Normalize an array of parts into an explicit format simpler for joining the path back together.
 */
function normalizePart(
  partOrRecord:
    | string
    | number
    | { part: string | number; isOptional: boolean },
): { part: string; isOptional: boolean; isBrackets: boolean } {
  if (typeof partOrRecord === "string") {
    if (partOrRecord === "" || /[ .]/.test(partOrRecord)) {
      return {
        part: `["${partOrRecord}"]`,
        isOptional: false,
        isBrackets: true,
      };
    }

    // Treat numeric strings as array access
    if (/\d+/.test(partOrRecord)) {
      return {
        part: `[${partOrRecord}]`,
        isOptional: false,
        isBrackets: true,
      };
    }

    return {
      part: trimEnd(partOrRecord, "?"),
      isOptional: partOrRecord.endsWith("?"),
      isBrackets: false,
    };
  }

  if (typeof partOrRecord === "number") {
    return { part: `[${partOrRecord}]`, isOptional: false, isBrackets: true };
  }

  const normalized = normalizePart(partOrRecord.part);

  return {
    ...normalized,
    isOptional: partOrRecord.isOptional || normalized.isOptional,
  };
}

// Counterpart to _.toPath: https://lodash.com/docs/4.17.15#toPath
// `fromPath` Missing from lodash: https://github.com/lodash/lodash/issues/2169
/**
 * Stringifies an object path from an array
 * Stringifies numeric property access as "foo[0].bar"
 *
 * @example getPathFromArray(["user", "name"]) // => "user.name"
 * @example getPathFromArray(["title", "Divine Comedy"]) // => "title["Divine Comedy"]"
 * @example getPathFromArray([{part: "title", isOptional: true}, "Divine Comedy"]) // => "title?.["Divine Comedy"]"
 */
export function getPathFromArray(
  parts: Array<
    string | number | { part: string | number; isOptional: boolean }
  >,
): string {
  const normalizedParts = parts.map((x) => normalizePart(x));

  return normalizedParts
    .map(({ part, isOptional, isBrackets }, index) => {
      let modified = part;

      if (isOptional) {
        modified = `${part}?`;
      }

      return index === 0 ||
        (isBrackets && !normalizedParts[index - 1]?.isOptional)
        ? modified
        : `.${modified}`;
    })
    .join("");
}

/**
 * Adds another part to the path
 * Stringifies numeric property access as "foo[0]"
 *
 * @example addPathPart("auth.user", "name") // => "auth.user.name"
 * @example addPathPart("metadata.links", "5") // => "metadata.links[5]"
 */
export function addPathPart(path: string, part: string | number): string {
  if (typeof part === "string" && /[ .]/.test(part)) {
    return `${path}["${part}"]`;
  }

  if (typeof part === "number" || /^\d+$/.test(part)) {
    return `${path}[${part}]`;
  }

  return path === "" ? part : `${path}.${part}`;
}
