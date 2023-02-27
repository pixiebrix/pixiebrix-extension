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

import { type UnknownObject } from "@/types";
import { isTemplateExpression, isVarExpression } from "@/runtime/mapArgs";
import { type Schema } from "@/core";
import { compact, isEmpty, uniq } from "lodash";
import {
  isDatabaseField,
  isGoogleSheetIdField,
  isGoogleSheetIdValue,
  isIconField,
  isSimpleServiceField,
  isServiceValue,
} from "./fieldTypeCheckers";

export type FieldInputMode =
  | "string"
  | "var"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "select"
  | "omit"; // An input option to remove a property

const DEFAULT_OPTIONS = {
  safeDefault: true,
};

/**
 * Try to infer the field toggle input mode from the current value of the field.
 * @param fieldConfig the current state/configuration of the field
 * @param fieldName the name of the field in the configuration
 * @param fieldSchema the JSON Schema for the field
 * @param options extra options for the function
 * @param options.safeDefault if true, return "string" instead of undefined when nothing matches; defaults to true
 */
export function inferInputMode(
  fieldConfig: UnknownObject,
  fieldName: string,
  fieldSchema: Schema,
  options: {
    safeDefault?: boolean;
  } = DEFAULT_OPTIONS
): FieldInputMode {
  const { safeDefault = true } = options;

  const hasField = Object.hasOwn(fieldConfig, fieldName);
  if (!hasField) {
    return "omit";
  }

  // eslint-disable-next-line security/detect-object-injection -- config field names
  const value = fieldConfig[fieldName];

  // We need to check sub-schemas first so things like services don't end up as var
  const subSchemas = uniq([
    ...(fieldSchema.anyOf ?? []),
    ...(fieldSchema.oneOf ?? []),
    ...(fieldSchema.allOf ?? []),
  ]);
  if (!isEmpty(subSchemas)) {
    const inputModes = compact(
      subSchemas
        .filter((x) => typeof x !== "boolean")
        .map((subSchema) =>
          inferInputMode(fieldConfig, fieldName, subSchema as Schema, {
            safeDefault: false,
          })
        )
    );
    if (!isEmpty(inputModes)) {
      return inputModes[0];
    }
  }

  if (isDatabaseField(fieldSchema)) {
    return isVarExpression(value) ? "var" : "select";
  }

  if (isIconField(fieldSchema)) {
    return isVarExpression(value) ? "var" : "select";
  }

  if (isSimpleServiceField(fieldSchema) && isServiceValue(value)) {
    return "select";
  }

  if (isGoogleSheetIdField(fieldSchema) && isGoogleSheetIdValue(value)) {
    return "string";
  }

  const hasEnum = !isEmpty(fieldSchema.examples ?? fieldSchema.enum);

  if (value == null) {
    return hasEnum ? "select" : "string";
  }

  if (isTemplateExpression(value)) {
    if (value.__type__ === "var") {
      return "var";
    }

    return "string";
  }

  // Array check must come before object check, arrays will report typeof === "object"
  if (Array.isArray(value)) {
    return "array";
  }

  const typeOf: string = typeof value;
  if (typeOf === "string") {
    return hasEnum ? "select" : "string";
  }

  // TODO: Should handle number the same way as string when implementing https://github.com/pixiebrix/pixiebrix-extension/issues/2341
  if (typeOf === "number" || typeOf === "boolean" || typeOf === "object") {
    return typeOf;
  }

  if (safeDefault) {
    return "string";
  }

  return undefined;
}
