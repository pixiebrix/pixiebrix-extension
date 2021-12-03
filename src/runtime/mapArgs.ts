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

import { UnknownObject } from "@/types";
import { Renderer, engineRenderer } from "./renderers";
import { isPlainObject, mapValues, pickBy } from "lodash";
import { getPropByPath, isSimplePath } from "./pathHelpers";
import { Expression, ExpressionType, TemplateEngine } from "@/core";
import { asyncMapValues } from "@/utils";
import Mustache from "mustache";
import { BlockPipeline } from "@/blocks/types";

const templateTypes: TemplateEngine[] = [
  "mustache",
  "nunjucks",
  "handlebars",
  "var",
];

const expressionTypes: ExpressionType[] = [
  ...templateTypes,
  "pipeline",
  "defer",
];

export type Args = string | UnknownObject | UnknownObject[];

/**
 * Returns true if value represents an explicit expression
 * @see isTemplateExpression
 */
export function isExpression(value: unknown): value is Expression<unknown> {
  if (
    isPlainObject(value) &&
    typeof value === "object" &&
    "__type__" in value
  ) {
    return expressionTypes.includes((value as Expression).__type__);
  }

  return false;
}

export function isPipelineExpression(
  value: unknown
): value is Expression<BlockPipeline, "pipeline"> {
  return isExpression(value) && value.__type__ === "pipeline";
}

/**
 * Returns true if value represents an explicit template engine expression
 * @see isExpression
 */
export function isTemplateExpression(
  value: unknown
): value is Expression<string, TemplateEngine> {
  return (
    isExpression(value) &&
    templateTypes.includes((value as Expression).__type__ as TemplateEngine)
  );
}

/**
 * Recursively render values
 * @since 1.5.0
 */
export async function renderExplicit(
  config: Args,
  ctxt: UnknownObject
): Promise<unknown> {
  if (isTemplateExpression(config)) {
    const render = await engineRenderer(config.__type__);
    return render(config.__value__, ctxt);
  }

  if (isExpression(config) && ["pipeline", "defer"].includes(config.__type__)) {
    // Pipelines are passed through directly
    return config.__value__;
  }

  // Array.isArray must come before the object check because arrays are objects
  if (Array.isArray(config)) {
    return Promise.all(config.map(async (x) => renderExplicit(x, ctxt)));
  }

  if (isPlainObject(config)) {
    const renderedEntries = await asyncMapValues(config, async (subConfig) =>
      renderExplicit(subConfig as UnknownObject, ctxt)
    );

    return pickBy(renderedEntries, (x) => x != null);
  }

  // Is a primitive value, e.g., string, number, etc.
  return config;
}

/**
 * Recursively apply a template renderer to a configuration.
 */
export function renderMustache(config: string, ctxt: UnknownObject): string;
// eslint-disable-next-line @typescript-eslint/ban-types -- we don't want to require index signature
export function renderMustache<T extends object>(
  config: T,
  ctxt: UnknownObject
): T;
export function renderMustache(
  config: UnknownObject[],
  ctxt: UnknownObject
): UnknownObject[];
export function renderMustache(config: Args, ctxt: UnknownObject): unknown {
  if (Array.isArray(config)) {
    return config.map((x) => renderMustache(x, ctxt));
  }

  if (isPlainObject(config) && typeof config === "object") {
    return pickBy(
      mapValues(config, (subConfig) => renderMustache(subConfig as any, ctxt)),
      (x) => x != null
    ) as any;
  }

  if (typeof config !== "string") {
    throw new TypeError("Expected string");
  }

  return Mustache.render(config, ctxt);
}

export function renderImplicit(
  config: Args,
  ctxt: UnknownObject,
  render: Renderer
): unknown {
  if (Array.isArray(config)) {
    return config.map((x) => renderImplicit(x, ctxt, render));
  }

  if (isPlainObject(config) && typeof config === "object") {
    return pickBy(
      mapValues(config, (subConfig) =>
        renderImplicit(subConfig as UnknownObject, ctxt, render)
      ),
      (x) => x != null
    );
  }

  if (typeof config === "string") {
    if (isSimplePath(config, ctxt)) {
      const prop = getPropByPath(ctxt, config);
      if (prop && typeof prop === "object" && "__service" in prop) {
        // If we're returning the root service context, return the service itself for use with proxyService
        // @ts-expect-error not sure why the "in" check isn't working
        return prop.__service;
      }

      return prop;
    }

    return render(config, ctxt);
  }

  return config;
}

type MapOptions = {
  /**
   * Render method for v1-v2 implicit runtime behavior
   */
  implicitRender: Renderer | null;
};

/**
 * Recursively apply a template renderer to a configuration.
 */
export async function mapArgs(
  config: Args,
  ctxt: UnknownObject,
  { implicitRender }: MapOptions
): Promise<unknown> {
  if (implicitRender) {
    return renderImplicit(config, ctxt, implicitRender);
  }

  return renderExplicit(config, ctxt);
}
