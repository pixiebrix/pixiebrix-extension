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

import { identity, toPath } from "lodash";
import { getErrorMessage } from "@/errors";
import { cleanValue, InvalidPathError, isObject, joinName } from "@/utils";
import { UnknownObject } from "@/types";
import { getOwnProp, hasOwnProp } from "@/utils/safeProps";

// First part of the path can be global context with a @
const pathRegex = /^(@?[\w-]+\??)(\.[\w-]+\??)*$/;

/**
 * Return true if maybePath refers to a property in ctxt.
 * @param maybePath
 * @param ctxt
 */
export function isSimplePath(maybePath: string, ctxt: UnknownObject): boolean {
  if (!ctxt || !pathRegex.test(maybePath)) {
    return false;
  }

  const [head] = maybePath.split(".");
  const path = head.endsWith("?") ? head.slice(0, -1) : head;
  return hasOwnProp(ctxt, path);
}

export interface ReadProxy {
  toJS: (value: unknown) => unknown;
  get: (value: unknown, prop: number | string) => unknown;
}

export const noopProxy: ReadProxy = {
  toJS: identity,
  get: (value, prop) => isObject(value) && getOwnProp(value, prop),
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

export function getPropByPath(
  obj: UnknownObject,
  path: string,
  {
    args = {},
    proxy = noopProxy,
    maxDepth = null,
  }: GetPropOptions | undefined = {}
): unknown {
  // Consider using jsonpath syntax https://www.npmjs.com/package/jsonpath-plus

  const { toJS = noopProxy.toJS, get = noopProxy.get } = proxy;

  let value: unknown = obj;
  const rawParts = toPath(path.trim());

  for (const [index, rawPart] of rawParts.entries()) {
    const previous = value;

    // Handle null coalescing syntax
    let part: string | number = rawPart;
    let coalesce = false;
    let numeric = false;

    if (rawPart.endsWith("?")) {
      part = rawPart.slice(0, -1);
      coalesce = true;
    }

    if (/^\d+$/.test(part) && Array.isArray(value)) {
      part = Number.parseInt(part, 10);
      numeric = true;
    }

    if (!(typeof value == "object" || (Array.isArray(previous) && numeric))) {
      throw new InvalidPathError(`Invalid path ${path}`, path);
    }

    value = get(value, part);

    if (value == null) {
      if (coalesce || index === rawParts.length - 1) {
        return null;
      }

      throw new InvalidPathError(`${path} undefined (missing ${part})`, path);
    }

    if (typeof value === "function") {
      try {
        value = value.apply(previous, args);
      } catch (error) {
        throw new Error(
          `Error running method ${part}: ${getErrorMessage(error)}`
        );
      }
    }
  }

  return cleanValue(toJS(value), maxDepth);
}

export function getFieldNamesFromPathString(
  name: string
): [parentFieldName: string | undefined, fieldName: string] {
  const path = toPath(name);
  const fieldName = path.pop();
  const parentFieldName = path.length > 0 ? joinName(null, ...path) : undefined;
  return [parentFieldName, fieldName];
}
