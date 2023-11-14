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

import {
  type DeferExpression,
  type Expression,
  type ExpressionType,
  type PipelineExpression,
  type TemplateEngine,
} from "@/types/runtimeTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { isObject } from "./objectUtils";

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

/**
 * A PipelineExpression with an attached lexical environment. Internal type used by the runtime
 * @since 1.7.29
 */
export type PipelineClosureExpression = PipelineExpression & {
  __env__: UnknownObject;
};

/**
 * Returns true if value represents an explicit template engine expression
 * @see isExpression
 */
export function isTemplateExpression(
  value: unknown
): value is Expression<string, TemplateEngine> {
  return isExpression(value) && templateTypes.includes(value.__type__);
}

/**
 * Returns true if value represents a variable expression
 * @see isExpression
 */
export function isVarExpression(
  value: unknown
): value is Expression<string, "var"> {
  return isExpression(value) && (value as Expression).__type__ === "var";
}

/**
 * Returns true if value represents a nunjucks expression
 * @see isExpression
 */
export function isNunjucksExpression(
  value: unknown
): value is Expression<string, "nunjucks"> {
  return isExpression(value) && (value as Expression).__type__ === "nunjucks";
}

export function isPipelineExpression(
  value: unknown
): value is PipelineExpression {
  return isExpression(value) && value.__type__ === "pipeline";
}

export function isPipelineClosureExpression(
  value: unknown
): value is PipelineClosureExpression {
  return isPipelineExpression(value) && "__env__" in value;
}

export function isDeferExpression<TValue = UnknownObject>(
  value: unknown
): value is DeferExpression<TValue> {
  return isExpression(value) && value.__type__ === "defer";
}

/**
 * Returns true if value represents an explicit expression
 * @see isTemplateExpression
 */
export function isExpression(value: unknown): value is Expression<unknown> {
  if (isObject(value) && typeof value.__type__ === "string") {
    return expressionTypes.includes(value.__type__);
  }

  return false;
}

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
  literalOrTemplate: unknown
): literalOrTemplate is string | null | Expression<string, TemplateEngine> {
  if (literalOrTemplate == null) {
    return true;
  }

  if (typeof literalOrTemplate === "string") {
    return true;
  }

  if (!isTemplateExpression(literalOrTemplate)) {
    return false;
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
  literalOrTemplate: unknown
): string | null {
  if (!isTextLiteralOrNull(literalOrTemplate)) {
    throw new TypeError("Expected literal, but found template expression");
  }

  if (literalOrTemplate == null || typeof literalOrTemplate === "string") {
    return literalOrTemplate as string | null;
  }

  return literalOrTemplate.__value__;
}
