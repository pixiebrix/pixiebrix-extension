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

import { createTypePredicate } from "@/components/fields/fieldUtils";
import { type Expression } from "@/types/runtimeTypes";
import { type LabelledEnumSchema, type Schema } from "@/types/schemaTypes";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import {
  SERVICE_BASE_SCHEMA,
  SERVICE_FIELD_REFS,
} from "@/services/serviceUtils";
import { isEmpty } from "lodash";
import keySchema from "@schemas/key.json";
import iconSchema from "@schemas/icon.json";
import databaseSchema from "@schemas/database.json";
import googleSheetIdSchema from "@schemas/googleSheetId.json";
import { isVarExpression } from "@/runtime/mapArgs";

export const isAppServiceField = createTypePredicate(
  (schema) => schema.$ref === `${SERVICE_BASE_SCHEMA}${PIXIEBRIX_SERVICE_ID}`
);

export const isServiceField = createTypePredicate(
  (x) =>
    x.$ref?.startsWith(SERVICE_BASE_SCHEMA) ||
    SERVICE_FIELD_REFS.includes(x.$ref)
);

export const isCssClassField = (fieldDefinition: Schema) =>
  fieldDefinition.type === "string" &&
  fieldDefinition.format === "bootstrap-class";

export const isHeadingStyleField = (fieldDefinition: Schema) =>
  fieldDefinition.type === "string" &&
  fieldDefinition.format === "heading-style";

/**
 * Returns true if the schema uses oneOf and "const" keyword to label enum options.
 * Read more at: https://github.com/json-schema-org/json-schema-spec/issues/57#issuecomment-247861695
 * @param schema
 */
export function isLabelledEnumField(
  schema: Schema
): schema is LabelledEnumSchema {
  return (
    schema.type === "string" &&
    schema.oneOf != null &&
    schema.oneOf.length > 0 &&
    schema.oneOf.every((x) => typeof x === "object" && "const" in x)
  );
}

/**
 * Returns true if schema is a field that should be rendered as a select or a creatable select field.
 * @param schema the field schema
 */
export function isSelectField(schema: Schema): boolean {
  const primitiveValues = schema.examples ?? schema.enum;
  const isPrimitiveSelect =
    schema.type === "string" &&
    Array.isArray(primitiveValues) &&
    !isEmpty(primitiveValues);
  return isPrimitiveSelect || isLabelledEnumField(schema);
}

export function isKeyStringField(schema: Schema): boolean {
  return schema.$ref === keySchema.$id;
}

export function isDatabaseField(schema: Schema): boolean {
  return schema.$ref === databaseSchema.$id;
}

export function isIconField(schema: Schema): boolean {
  return schema.$ref === iconSchema.$id;
}

export function isGoogleSheetIdField(schema: Schema): boolean {
  return (
    schema.$ref === googleSheetIdSchema.$id ||
    schema.$id === googleSheetIdSchema.$id
  );
}

/**
 * Check if a schema matches a service field without checking anyOf/oneOf/allOf
 * @param schema
 */
export function isSimpleServiceField(schema: Schema): boolean {
  return (
    schema.$ref?.startsWith(SERVICE_BASE_SCHEMA) ||
    schema.$id?.startsWith(SERVICE_BASE_SCHEMA) ||
    SERVICE_FIELD_REFS.includes(schema.$ref) ||
    SERVICE_FIELD_REFS.includes(schema.$id)
  );
}

export function isServiceValueFormat(value: unknown): value is Expression {
  // Default service value, see ServiceWidget
  if (value == null) {
    return true;
  }

  if (!isVarExpression(value)) {
    return false;
  }

  const varValue = value.__value__;

  // Service starts with @ and doesn't contain whitespace
  return /^@\S+$/.test(varValue);
}

export function isGoogleSheetIdValue(value: unknown): boolean {
  if (value == null) {
    // Allow null values
    return true;
  }

  // Sheets id values are strings with no whitespace
  return typeof value === "string" && /^\S+$/.test(value);
}
