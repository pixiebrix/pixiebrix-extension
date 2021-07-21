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

import { TemplateEngine } from "@/core";
import Mustache from "mustache";
import mapKeys from "lodash/mapKeys";

const hyphenRegex = /-/gi;

export type Renderer = (template: string, context: object) => string;

let _nunjucks: any;
let _handlebars: any;

async function ensureNunjucks() {
  if (!_nunjucks) {
    _nunjucks = (await import("nunjucks")).default;
    _nunjucks.configure({ autoescape: true });
  }
  return _nunjucks;
}

async function ensureHandlebars() {
  if (_handlebars) {
    _handlebars = (await import("handlebars")).default;
  }
  return _handlebars;
}

export async function engineRenderer(
  templateEngine: TemplateEngine = "mustache"
): Promise<Renderer | undefined> {
  switch (templateEngine.toLowerCase()) {
    case "mustache": {
      return Mustache.render;
    }

    case "nunjucks": {
      const nunjucks = await ensureNunjucks();
      return (template, ctxt) => {
        // Convert top level data from kebab case to snake case in order to be valid identifiers
        const snakeCased = mapKeys(ctxt, (value, key) =>
          key.replace(hyphenRegex, "_")
        );
        return nunjucks.renderString(template, snakeCased);
      };
    }

    case "handlebars": {
      const handlebars = await ensureHandlebars();
      return (template, ctxt) => {
        const compiledTemplate = handlebars.compile(template);
        return compiledTemplate(ctxt);
      };
    }

    default: {
      return undefined;
    }
  }
}
