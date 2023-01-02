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

import { type ApplyJqPayload, type TemplateRenderPayload } from "./api";
import { isErrorObject } from "@/errors/errorHelpers";
import { InvalidTemplateError } from "@/errors/businessErrors";

export async function renderNunjucksTemplate(
  payload: TemplateRenderPayload
): Promise<string> {
  const { template, context, autoescape } = payload;

  // Webpack caches the module import, so doesn't need to cache via lodash's `once`
  const { default: nunjucks } = await import(
    /* webpackChunkName: "nunjucks" */ "nunjucks"
  );

  nunjucks.configure({ autoescape });
  try {
    return nunjucks.renderString(template, context);
  } catch (error) {
    if (isErrorObject(error) && error.name === "Template render error") {
      throw new InvalidTemplateError(error.message, template);
    }

    throw error;
  }
}

export async function renderHandlebarsTemplate(
  payload: TemplateRenderPayload
): Promise<string> {
  const { template, context, autoescape } = payload;

  // Webpack caches the module import, so doesn't need to cache via lodash's `once`
  const { default: handlebars } = await import(
    /* webpackChunkName: "handlebars" */ "handlebars"
  );

  const compiledTemplate = handlebars.compile(template, {
    noEscape: !autoescape,
  });
  return compiledTemplate(context);
}

export async function applyJq(payload: ApplyJqPayload) {
  const { input, filter } = payload;
  const { default: jq } = await import(
    /* webpackChunkName: "jq-web" */ "jq-web"
  );

  return jq.promised.json(input, filter);
}
