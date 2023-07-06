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

import { type Expression } from "@/types/runtimeTypes";

/**
 * Returns true if `literalOrTemplate` includes any template expressions that would be replaced by `context`.
 * @param literalOrTemplate the string literal or Nunjucks/Handlebars template.
 */
export function containsTemplateExpression(literalOrTemplate: string): boolean {
  return literalOrTemplate.includes("{{") || literalOrTemplate.includes("{%");
}

/**
 * Returns true if the value is a string, or a literal string expression.
 * @see castTextLiteralOrThrow
 */
export function isTextLiteralOrNull(
  literalOrTemplate: string | null | Expression
): boolean {
  if (literalOrTemplate == null) {
    return true;
  }

  if (typeof literalOrTemplate === "string") {
    return true;
  }

  if (
    !["mustache", "handlebars", "nunjucks"].includes(literalOrTemplate.__type__)
  ) {
    return false;
  }

  return !containsTemplateExpression(literalOrTemplate.__value__);
}

/**
 * Returns the string value of a literal or expression with only literal text.
 * @see isTextLiteralOrNull
 */
export function castTextLiteralOrThrow(
  literalOrTemplate: string | null | Expression
): string | null {
  if (literalOrTemplate == null || typeof literalOrTemplate === "string") {
    return literalOrTemplate as string | null;
  }

  if (!isTextLiteralOrNull(literalOrTemplate)) {
    throw new TypeError("Expected literal, but found template expression");
  }

  return literalOrTemplate.__value__;
}
