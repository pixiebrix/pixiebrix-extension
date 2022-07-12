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

import { Schema, SchemaDefinition } from "@/core";
import { getErrorMessage } from "@/errors/errorHelpers";
import { isTemplateExpression } from "@/runtime/mapArgs";
import { UnknownObject } from "@/types";
import { FieldValidator } from "formik";
import { Draft, produce } from "immer";
import * as Yup from "yup";

export function fieldLabel(name: string): string {
  const parts = name.split(".");
  return parts[parts.length - 1];
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

function unwrapTemplateExpressions(mutableObj: Draft<any>) {
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
  validationSchema: Yup.ObjectSchema<any> | undefined
): FieldValidator | undefined {
  if (validationSchema == null) {
    return undefined;
  }

  return async (fieldValue) => {
    try {
      await validationSchema.validate(fieldValue);
    } catch (error) {
      return getErrorMessage(error);
    }
  };
}
