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

import {
  type TemplateValidatePayload,
  type JavaScriptPayload,
  type TemplateRenderPayload,
} from "./api";
import { isErrorObject } from "@/errors/errorHelpers";
import { BusinessError, InvalidTemplateError } from "@/errors/businessErrors";
import { type JsonObject } from "type-fest";

export async function renderNunjucksTemplate(
  payload: TemplateRenderPayload,
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

export async function validateNunjucksTemplate(
  template: TemplateValidatePayload,
): Promise<void> {
  // Webpack caches the module import, so doesn't need to cache via lodash's `once`
  const { compile } = await import(
    /* webpackChunkName: "nunjucks" */ "nunjucks"
  );

  try {
    // @ts-expect-error -- The last parameter is not in the types yet
    compile(template, undefined, undefined, true);
  } catch (error) {
    if (isErrorObject(error) && error.name === "Template render error") {
      const failureCause = error.message?.replace("(unknown path)", "").trim();
      throw new InvalidTemplateError(failureCause, template);
    }

    throw error;
  }
}

export async function renderHandlebarsTemplate(
  payload: TemplateRenderPayload,
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

export async function runUserJs({
  code,
  data,
}: JavaScriptPayload): Promise<string> {
  let userFunction: (context: JsonObject | undefined) => string;
  try {
    /* eslint-disable-next-line no-new-func, @typescript-eslint/no-unsafe-assignment
    -- Returning the user-defined function allows for an anonymous function */
    userFunction = new Function(`return ${code}`)();
  } catch {
    throw new BusinessError("Failed to construct JavaScript function");
  }

  // See https://stackoverflow.com/a/67102501/288906
  const context = data
    ? new Proxy(data, {
        has: () => true,
      })
    : undefined;

  try {
    return userFunction(context);
  } catch (error) {
    throw new BusinessError("Error running user-defined JavaScript", {
      cause: error,
    });
  }
}
