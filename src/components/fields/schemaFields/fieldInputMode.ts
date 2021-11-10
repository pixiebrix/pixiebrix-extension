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
import { UnknownObject } from "@/types";
import { isExpression } from "@/runtime/mapArgs";

export type FieldInputMode =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "omit" // An input option to remove a property
  | TemplateEngine;

export function isTemplateEngine(
  inputMode: FieldInputMode
): inputMode is TemplateEngine {
  return ["mustache", "nunjucks", "handlebars", "var"].includes(inputMode);
}

export function inferInputMode(
  fieldConfig: UnknownObject,
  fieldName: string
): FieldInputMode {
  const hasField = Object.prototype.hasOwnProperty.call(fieldConfig, fieldName);
  if (!hasField) {
    return "omit";
  }

  // eslint-disable-next-line security/detect-object-injection -- config field names
  const value = fieldConfig[fieldName];

  if (isExpression(value)) {
    return value.__type__;
  }

  // Array check must come before object check, arrays will report typeof === "object"
  if (Array.isArray(value)) {
    return "array";
  }

  const typeOf: string = typeof value;
  if (
    typeOf === "string" ||
    typeOf === "number" ||
    typeOf === "boolean" ||
    typeOf === "object"
  ) {
    return typeOf;
  }

  return "string";
}
