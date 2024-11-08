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

import { getErrorMessage } from "../../errors/errorHelpers";
import { type FieldValidator } from "formik";
import { type Draft, produce } from "immer";
import type * as Yup from "yup";
import { isEmpty, startCase } from "lodash";
import { type Schema, type SchemaDefinition } from "../../types/schemaTypes";
import { isExpression, isTemplateExpression } from "../../utils/expressionUtils";

/**
 * Acronyms to capitalize in field labels.
 */
const FIELD_TITLE_ACRONYMS = new Set([
  "API",
  "CRUD",
  "CSS",
  "CSV",
  "GUI",
  "HTML",
  "HTTP",
  "HTTPS",
  "JS",
  "JSON",
  "REST",
  "SAP",
  "SDK",
  "SQL",
  "UI",
  "URL",
  // Discussion: https://english.stackexchange.com/questions/101248/how-should-the-abbreviation-for-identifier-be-capitalized
  "ID",
]);

/**
 * Returns the default label for a field with the given form name.
 * @param name the form name, including field name separators
 */
export function fieldLabel(name: string): string {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Presumably the name is never empty, so there's always a "last item"
  const namePart = name.split(".").at(-1)!;

  return startCase(namePart)
    .split(" ")
    .map((word) => {
      if (FIELD_TITLE_ACRONYMS.has(word.toUpperCase())) {
        return word.toUpperCase();
      }

      return word;
    })
    .join(" ");
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
export function unwrapTemplateExpressions<
  T extends UnknownObject | ArrayLike<unknown>,
>(mutableObj: Draft<T | null>) {
  if (mutableObj == null || typeof mutableObj !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(mutableObj)) {
    if (isTemplateExpression(value)) {
      // @ts-expect-error -- typings need to be improved
      mutableObj[key] = value.__value__;
    } else if (typeof value === "object") {
      unwrapTemplateExpressions(value as UnknownObject);
    }
  }
}

export function getPreviewValues<
  T extends UnknownObject | ArrayLike<unknown> = UnknownObject,
>(obj: T): T {
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
  validationSchema: Yup.AnySchema | undefined,
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
  schema: Schema | undefined,
): Record<string, Record<string, string>> => {
  const errMessages: Record<string, Record<string, string>> = {};

  if (!schema?.properties) {
    return errMessages;
  }

  for (const [key, definition] of Object.entries(schema.properties)) {
    if (typeof definition === "boolean") {
      continue;
    }

    // eslint-disable-next-line security/detect-object-injection -- no user generated values here
    const messages = errMessages[key] ?? {};

    if (schema.required?.includes(key)) {
      messages.required = `${key} is a required field`;
    }

    if (definition.pattern) {
      messages.pattern = `Invalid ${key} format`;
    }

    if (!isEmpty(messages)) {
      // eslint-disable-next-line security/detect-object-injection -- no user generated values here
      errMessages[key] = messages;
    }
  }

  return errMessages;
};
