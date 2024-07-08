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

import { createTypePredicate } from "@/components/fields/fieldUtils";
import { type Expression } from "@/types/runtimeTypes";
import {
  type LabelledEnumSchema,
  type Schema,
  type SchemaDefinition,
  type UiSchema,
} from "@/types/schemaTypes";
import { get, isEmpty } from "lodash";
import keySchema from "@schemas/key.json";
import iconSchema from "@schemas/icon.json";
import databaseSchema from "@schemas/database.json";
import googleSheetIdSchema from "@schemas/googleSheetId.json";

import { isVarExpression } from "@/utils/expressionUtils";
import {
  INTEGRATION_DEPENDENCY_FIELD_REFS,
  PIXIEBRIX_INTEGRATION_REF_URL,
  INTEGRATIONS_BASE_SCHEMA_URL,
} from "@/integrations/constants";

export const isPixiebrixIntegrationField = createTypePredicate(
  (schema) => schema.$ref === PIXIEBRIX_INTEGRATION_REF_URL,
);

function isIntegrationRef(ref?: string): boolean {
  if (!ref) {
    return false;
  }

  return (
    ref.startsWith(INTEGRATIONS_BASE_SCHEMA_URL) ||
    INTEGRATION_DEPENDENCY_FIELD_REFS.includes(ref)
  );
}

export const isIntegrationDependencyField = createTypePredicate((x) =>
  isIntegrationRef(x.$ref),
);

export const isCssClassField = (fieldDefinition: Schema) =>
  fieldDefinition.type === "string" &&
  fieldDefinition.format === "bootstrap-class";

export const isHeadingStyleField = (fieldDefinition: Schema) =>
  fieldDefinition.type === "string" &&
  fieldDefinition.format === "heading-style";

export const hasCustomWidget = (uiSchema?: UiSchema) =>
  typeof get(uiSchema, ["ui:widget"]) === "string";

/**
 * Returns true if the schema uses oneOf and "const" keyword to label enum options.
 * Read more at: https://github.com/json-schema-org/json-schema-spec/issues/57#issuecomment-247861695
 */
export function isLabelledEnumField(
  schema: Schema,
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
 */
export function isSelectField(fieldSchema: Schema): boolean {
  const primitiveValues = fieldSchema.examples ?? fieldSchema.enum;
  const isPrimitiveSelect =
    fieldSchema.type === "string" &&
    Array.isArray(primitiveValues) &&
    !isEmpty(primitiveValues);
  return isPrimitiveSelect || isLabelledEnumField(fieldSchema);
}

export function isKeyStringField(schema: Schema): boolean {
  return schema.$ref === keySchema.$id;
}

export function isDatabaseField(schema: Schema): boolean {
  return schema.$ref === databaseSchema.$id;
}

type DataPreviewFieldSchema = {
  $ref: typeof databaseSchema.$id;
  format: "preview";
};

// Provide generic to support additional properties on the schema (e.g., title)
export function isDatabasePreviewField<T extends DataPreviewFieldSchema>(
  schema: SchemaDefinition,
): schema is T {
  return (
    typeof schema !== "boolean" &&
    isDatabaseField(schema) &&
    schema.format === "preview"
  );
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
 */
export function isSimpleServiceField(schema: Schema): boolean {
  return isIntegrationRef(schema.$ref) || isIntegrationRef(schema.$id);
}

export function isIntegrationDependencyValueFormat(
  value: unknown,
): value is Expression {
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
