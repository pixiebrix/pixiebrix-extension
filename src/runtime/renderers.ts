/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type TemplateEngine } from "@/types/runtimeTypes";
import Mustache from "mustache";
import { identity, mapKeys } from "lodash";
import { getPropByPath } from "@/runtime/pathHelpers";
import { type JsonObject } from "type-fest";
import {
  renderHandlebarsTemplate,
  renderNunjucksTemplate,
} from "@/sandbox/messenger/executor";
import { type UnknownObject } from "@/types/objectTypes";

export type AsyncTemplateRenderer = (
  template: string,
  context: unknown
) => Promise<unknown>;
export type TemplateRenderer = (template: string, context: unknown) => unknown;

export type RendererOptions = {
  autoescape?: boolean;
};

/**
 * Returns true if `literalOrTemplate` includes any template expressions that would be replaced by `context`.
 * @param literalOrTemplate the string literal or Nunjucks/Handlebars template.
 */
function containsTemplateExpression(literalOrTemplate: string): boolean {
  return literalOrTemplate.includes("{{") || literalOrTemplate.includes("{%");
}

export function engineRenderer(
  templateEngine: TemplateEngine,
  options: RendererOptions
): AsyncTemplateRenderer | undefined {
  const autoescape = options.autoescape ?? true;

  if (templateEngine == null) {
    throw new Error("templateEngine is required");
  }

  switch (templateEngine.toLowerCase()) {
    case "mustache": {
      // Mustache can run directly (not in sandbox) because it doesn't use eval or Function constructor
      return async (template, ctxt) =>
        Mustache.render(
          template,
          ctxt,
          {},
          {
            // By passing undefined here if autoescape = true, mustache will use it's built-in escaping method.
            escape: autoescape ? undefined : identity,
          }
        );
    }

    case "nunjucks": {
      return async (template, ctxt) => {
        if (!containsTemplateExpression(template)) {
          // Avoid trip to sandbox for literal values
          return template;
        }

        // Convert top level data from kebab case to snake case in order to be valid identifiers
        const snakeCased = mapKeys(ctxt as UnknownObject, (value, key) =>
          key.replaceAll("-", "_")
        );

        return renderNunjucksTemplate({
          template,
          context: snakeCased as JsonObject,
          autoescape: options.autoescape,
        });
      };
    }

    case "handlebars": {
      return async (template, ctxt) => {
        if (!containsTemplateExpression(template)) {
          // Avoid trip to sandbox for literal values
          return template;
        }

        return renderHandlebarsTemplate({
          template,
          context: ctxt as JsonObject,
          autoescape: options.autoescape,
        });
      };
    }

    case "var": {
      return async (template, ctxt) => {
        // `var` can run directly (not in sandbox) because it doesn't use eval or Function constructor
        const value = getPropByPath(ctxt as UnknownObject, template);
        if (value && typeof value === "object" && "__service" in value) {
          // If we're returning the root service context, return the service itself for use with proxyService
          return value.__service;
        }

        return value;
      };
    }

    default: {
      return undefined;
    }
  }
}
