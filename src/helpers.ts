/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import Mustache from "mustache";
import { mapValues, pickBy, isPlainObject } from "lodash";
import { Schema, SchemaProperties } from "@/core";
import { getPropByPath } from "@/utils";
import { Renderer } from "@/utils/renderers";

// First part of the path can be global context with a @
const pathRegex = /^(@?[\w-]+\??)(\.[\w-]+\??)*$/;

/**
 * Return true if maybePath refers to a property in ctxt.
 * @param maybePath
 * @param ctxt
 */
export function isSimplePath(maybePath: string, ctxt: object): boolean {
  if (!pathRegex.test(maybePath)) {
    return false;
  }

  const [head] = maybePath.split(".");
  const path = head.endsWith("?") ? head.slice(0, -1) : head;
  return ctxt ? Object.prototype.hasOwnProperty.call(ctxt, path) : false;
}

type Args = string | object | object[];

/**
 * Recursively apply a template renderer to a configuration.
 */
export function mapArgs(
  config: string,
  ctxt: object,
  render?: Renderer
): string;
export function mapArgs<T extends object>(
  config: T,
  ctxt: object,
  render?: Renderer
): T;
export function mapArgs(
  config: object[],
  ctxt: object,
  render?: Renderer
): object[];
export function mapArgs(
  config: Args,
  ctxt: object,
  render: Renderer = Mustache.render
): unknown {
  if (Array.isArray(config)) {
    return config.map((x) => mapArgs(x, ctxt, render));
  }

  if (isPlainObject(config)) {
    return pickBy(
      mapValues(config as object, (subConfig) =>
        mapArgs(subConfig, ctxt, render)
      ),
      (x) => x != null
    );
  }

  if (typeof config === "string") {
    if (isSimplePath(config, ctxt)) {
      const prop = getPropByPath(ctxt as Record<string, unknown>, config);
      if (prop && typeof prop === "object" && "__service" in prop) {
        // If we're returning the root service context, return the service itself
        // @ts-ignore: not sure why the "in" check isn't working
        return prop.__service;
      }

      return prop;
    }

    return render(config, ctxt);
  }

  return config;
}

/**
 * Return the names of top-level required properties that are missing
 */
export function missingProperties(
  schema: Schema,
  obj: Record<string, any>
): string[] {
  const acc = [];
  for (const propertyKey of schema.required ?? []) {
    const property = schema.properties[propertyKey];
    if (typeof property === "object" && property?.type === "string") {
      const value = obj[propertyKey];
      if ((value ?? "").trim().length === 0) {
        acc.push(propertyKey);
      }
    }
  }

  return acc;
}

export function inputProperties(inputSchema: Schema): SchemaProperties {
  if (typeof inputSchema === "object" && "properties" in inputSchema) {
    return inputSchema.properties;
  }

  return inputSchema as SchemaProperties;
}

/**
 * True if the script is executing in a web browser context.
 */
export const isBrowser =
  typeof window !== "undefined" && typeof window.document !== "undefined";
