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

import { type Schema, type SchemaDefinition } from "@/core";
import { getErrorMessage } from "@/errors/errorHelpers";
import { isExpression, isTemplateExpression } from "@/runtime/mapArgs";
import { type UnknownObject } from "@/types";
import { type FieldValidator } from "formik";
import { type Draft, produce } from "immer";
import type * as Yup from "yup";

export function fieldLabel(name: string): string {
  return name.split(".").at(-1);
}

type TypePredicate = (fieldDefinition: Schema) => boolean;

export function createTypePredicate(predicate: TypePredicate): TypePredicate {
  return (fieldDefinition: Schema) => {
    if (predicate(fieldDefinition)) {
      return true;
    }

    const matches = (x: SchemaDefinition) =>
      typeof x !== "boolean" && predicate(x);

    if ((fieldDefinition.oneOf ?? []).some((x) => matches(x))) {
      return true;
    }

    if ((fieldDefinition.anyOf ?? []).some((x) => matches(x))) {
      return true;
    }

    if ((fieldDefinition.allOf ?? []).some((x) => matches(x))) {
      return true;
    }

    return false;
  };
}

/**
 * Replaces expressions in a schema with their __value__.
 * Does not resolve the variables against a context.
 * Mutates the given object.
 */
export function unwrapTemplateExpressions(mutableObj: Draft<any>) {
  if (mutableObj === null || typeof mutableObj !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(mutableObj)) {
    if (isTemplateExpression(value)) {
      mutableObj[key] = value.__value__;
    } else if (typeof value === "object") {
      unwrapTemplateExpressions(value);
    }
  }
}

export function getPreviewValues<TObj = UnknownObject>(obj: TObj): TObj {
  return produce(obj, (draft) => {
    unwrapTemplateExpressions(draft);
  });
}

export function isMustacheOnly(value: string): boolean {
  // Mustache-specific syntax: {{{, {{!, {{#, {{&, {{>, {{^
  // All but the first one also support whitespace between the brackets and symbols
  return /{{{/g.test(value) || /{{\s*[!#&=>^]/g.test(value);
}

export function getFieldValidator(
  validationSchema: Yup.AnySchema | undefined
): FieldValidator | undefined {
  if (validationSchema == null) {
    return undefined;
  }

  return async (fieldValue) => {
    const value = isExpression(fieldValue) ? fieldValue.__value__ : fieldValue;
    try {
      await validationSchema.validate(value);
    } catch (error) {
      return getErrorMessage(error);
    }
  };
}

// Collects custom validation error messages for this schema to be passed to the `config.errMessages`
// parameter of buildYup
// See https://github.com/kristianmandrup/schema-to-yup#quick-start
export const getValidationErrMessages = (
  schema: Schema | undefined
): Record<string, Record<string, string>> => {
  const errMessages: Record<string, Record<string, string>> = {};

  if (!schema) {
    return errMessages;
  }

  for (const [key, definition] of Object.entries(schema?.properties)) {
    if (typeof definition === "boolean") {
      continue;
    }

    // eslint-disable-next-line security/detect-object-injection -- no user generated values here
    const messages = errMessages[key] ?? {};

    if (schema.required.includes(key)) {
      messages.required = `${key} is required`;
    }

    if (definition.pattern) {
      messages.pattern = `Invalid ${key} format`;
    }
  }

  return errMessages;
};
