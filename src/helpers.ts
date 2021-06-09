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

import Mustache from "mustache";
import nunjucks from "nunjucks";
import isPlainObject from "lodash/isPlainObject";
import mapValues from "lodash/mapValues";
import pickBy from "lodash/pickBy";
import mapKeys from "lodash/mapKeys";
import { TemplateEngine, Schema, SchemaProperties } from "@/core";
import Handlebars from "handlebars";
import { getPropByPath } from "@/utils";

nunjucks.configure({ autoescape: true });

const hyphenRegex = /-/gi;

type Renderer = (template: string, context: object) => string;

export function engineRenderer(
  templateEngine: TemplateEngine = "mustache"
): Renderer | undefined {
  switch (templateEngine.toLowerCase()) {
    case "mustache": {
      return Mustache.render;
    }
    case "nunjucks": {
      // convert top level data from kebab case to snake case in order to be valid identifiers
      return (template, ctxt) => {
        const snakeCased = mapKeys(ctxt, (value, key) =>
          key.replace(hyphenRegex, "_")
        );
        return nunjucks.renderString(template, snakeCased);
      };
    }
    case "handlebars": {
      return (template, ctxt) => {
        const compiledTemplate = Handlebars.compile(template);
        return compiledTemplate(ctxt);
      };
    }
    default: {
      return undefined;
    }
  }
}

// first part of the path can be global context with a @
const pathRegex = /^(@?[a-zA-Z0-9_\-]+\??)(\.[a-zA-Z0-9_\-]+\??)*$/;

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
  } else if (isPlainObject(config)) {
    return pickBy(
      mapValues(config as object, (subConfig) =>
        mapArgs(subConfig, ctxt, render)
      ),
      (x) => x != null
    );
  } else if (typeof config === "string") {
    if (isSimplePath(config, ctxt)) {
      const prop = getPropByPath(ctxt as { [prop: string]: unknown }, config);
      if (prop && typeof prop === "object" && "__service" in prop) {
        // if we're returning the root service context, return the service itself
        // @ts-ignore: not sure why the "in" check isn't working
        return prop.__service;
      } else {
        return prop;
      }
    } else {
      return render(config, ctxt);
    }
  } else {
    return config;
  }
}

/**
 * Return the names of top-level required properties that are missing
 */
export function missingProperties(
  schema: Schema,
  obj: { [key: string]: any }
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
  } else {
    return inputSchema as SchemaProperties;
  }
}

export const isChrome = navigator.userAgent.includes("chrome");
