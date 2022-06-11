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

import { TemplateEngine } from "@/core";
import Mustache from "mustache";
import { mapKeys, identity, once } from "lodash";
import { getPropByPath } from "@/runtime/pathHelpers";
import { UnknownObject } from "@/types";
import { isErrorObject } from "@/errors/errorHelpers";
import { InvalidTemplateError } from "@/errors/businessErrors";

const hyphenRegex = /-/gi;

export type Renderer = (template: string, context: unknown) => unknown;

const ensureNunjucks = once(async () => {
  const { default: nunjucks } = await import(
    /* webpackChunkName: "nunjucks" */ "nunjucks"
  );
  return nunjucks;
});

export type RendererOptions = {
  autoescape?: boolean;
};

export async function engineRenderer(
  templateEngine: TemplateEngine,
  options: RendererOptions
): Promise<Renderer | undefined> {
  const autoescape = options.autoescape ?? true;

  if (templateEngine == null) {
    throw new Error("templateEngine is required");
  }

  switch (templateEngine.toLowerCase()) {
    case "mustache": {
      return (template, ctxt) =>
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
      const nunjucks = await ensureNunjucks();
      nunjucks.configure({ autoescape });
      return (template, ctxt) => {
        // Convert top level data from kebab case to snake case in order to be valid identifiers
        const snakeCased = mapKeys(ctxt as UnknownObject, (value, key) =>
          key.replace(hyphenRegex, "_")
        );

        try {
          return nunjucks.renderString(template, snakeCased);
        } catch (error) {
          if (isErrorObject(error) && error.name === "Template render error") {
            throw new InvalidTemplateError(error.message, template);
          }

          throw error;
        }
      };
    }

    case "handlebars": {
      const { default: handlebars } = await import(
        /* webpackChunkName: "handlebars" */ "handlebars"
      );
      return (template, ctxt) => {
        const compiledTemplate = handlebars.compile(template, {
          noEscape: !autoescape,
        });
        return compiledTemplate(ctxt);
      };
    }

    case "var": {
      return (template, ctxt) => {
        const value = getPropByPath(ctxt as UnknownObject, template);
        if (value && typeof value === "object" && "__service" in value) {
          // If we're returning the root service context, return the service itself for use with proxyService
          // @ts-expect-error not sure why the "in" check isn't working
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
