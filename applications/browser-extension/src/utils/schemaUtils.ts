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
  type Schema,
  type SchemaDefinition,
  type SchemaProperties,
  type UiSchema,
} from "@/types/schemaTypes";
import { castArray, intersection, isEmpty, uniq } from "lodash";
import { isNullOrBlank } from "./stringUtils";
import { UI_ORDER } from "@/components/formBuilder/schemaFieldNames";
import { type Nullishable } from "./nullishUtils";

/**
 * Return the names of top-level required properties that are missing or blank in an object.
 */
export function missingProperties(
  schema: Schema,
  obj: UnknownObject,
): string[] {
  const acc = [];
  for (const propertyKey of schema.required ?? []) {
    // eslint-disable-next-line security/detect-object-injection -- for-of loop
    const property = schema.properties?.[propertyKey];
    if (typeof property === "object" && property?.type === "string") {
      // eslint-disable-next-line security/detect-object-injection -- for-of loop over the schema
      const value = obj[propertyKey];
      if (isNullOrBlank(value)) {
        acc.push(propertyKey);
      }
    }
  }

  return acc;
}

/**
 * Convert JSON Schema properties value to a top-level JSON Schema.
 * @see inputProperties
 */
export function propertiesToSchema(
  properties: SchemaProperties,
  required: Array<keyof SchemaProperties>,
): Schema {
  return {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties,
    required,
  };
}

/**
 * Return the names of top-level properties in a JSON Schema or object.
 * @see propertiesToSchema
 */
export function inputProperties(
  inputSchema: Nullishable<Schema>,
): SchemaProperties {
  // NOTE: returning the argument is UNSAFE and is not consistent with the parameter type `Schema`.
  // In the past, PixieBrix definitions have supported shorthand of providing the properties directly.

  // Handle unchecked casts of invalid user-provided definitions
  if (inputSchema == null || typeof inputSchema !== "object") {
    return {} as SchemaProperties;
  }

  // It looks like a Schema, even if `properties` property is not provided
  if ("$schema" in inputSchema || inputSchema.type === "object") {
    return inputSchema.properties ?? {};
  }

  if (inputSchema.properties != null) {
    return inputSchema.properties;
  }

  return inputSchema as SchemaProperties;
}

/**
 * Returns true if the schema uses anyOf/oneOf/allOf/not.
 * @param schema the JSON Schema
 */
function isComplexSchema(schema: Schema): boolean {
  // https://json-schema.org/understanding-json-schema/reference/combining.html
  return (
    Boolean(schema.anyOf) ||
    Boolean(schema.oneOf) ||
    Boolean(schema.allOf) ||
    Boolean(schema.not)
  );
}

/**
 * Returns true if the schema requires the given key.
 * @param schema the JSON Schema
 * @param key the property key
 */
export function isRequired(schema: Schema, key: string): boolean {
  return schema.required?.includes(key) ?? false;
}

/**
 * Returns a schema that is the union of the two input schemas, allowing any properties that are allowed by either.
 *
 * Does not preserve titles/descriptions/etc.
 *
 * WARNING: this method was designed for use with Brick.getModVariableSchema. It does not precisely support all schemas.
 *
 * @param lhs an object schema
 * @param rhs the other object schema
 */
// eslint-disable-next-line complexity -- there's a lot of combinations to handle :shrug:
export function unionSchemaDefinitionTypes(
  lhs: SchemaDefinition,
  rhs: SchemaDefinition,
): SchemaDefinition {
  if (isEmpty(lhs) || isEmpty(rhs)) {
    return true;
  }

  if (lhs === true || rhs === true) {
    return true;
  }

  if (lhs === false) {
    return rhs;
  }

  if (rhs === false) {
    return lhs;
  }

  if (isComplexSchema(lhs) || isComplexSchema(rhs)) {
    // Punt on complex schemas for now and permit anything
    return true;
  }

  if (Array.isArray(lhs.type) || Array.isArray(rhs.type)) {
    return {
      type: uniq([...castArray(lhs.type), ...castArray(rhs.type)]),
    };
  }

  if (
    typeof lhs.type === "string" &&
    typeof rhs.type === "string" &&
    lhs.type !== "object" &&
    rhs.type !== "object"
  ) {
    if (lhs.type === rhs.type) {
      return {
        type: lhs.type,
      };
    }

    return {
      type: [lhs.type, rhs.type],
    };
  }

  if (lhs.type !== "object" || rhs.type !== "object") {
    // For now, just do a simple union
    return {
      anyOf: [lhs, rhs],
    };
  }

  // Merge the objects
  const result: Required<
    Pick<Schema, "type" | "properties" | "required" | "additionalProperties">
  > = {
    type: "object",
    properties: {},
    // Must be required in both to be required
    required: intersection(lhs.required ?? [], rhs.required ?? []),
    // Allow properties that are allowed by either
    additionalProperties:
      Boolean(lhs.additionalProperties) || Boolean(rhs.additionalProperties),
  };

  for (const property of uniq([
    ...Object.keys(lhs.properties ?? {}),
    ...Object.keys(rhs.properties ?? {}),
  ])) {
    // eslint-disable-next-line security/detect-object-injection -- from keys
    const lhsProperty = lhs.properties?.[property];
    // eslint-disable-next-line security/detect-object-injection -- from keys
    const rhsProperty = rhs.properties?.[property];

    if (lhsProperty == null && rhsProperty != null) {
      // eslint-disable-next-line security/detect-object-injection -- from keys
      result.properties[property] = rhsProperty;
    } else if (rhsProperty == null && lhsProperty != null) {
      // eslint-disable-next-line security/detect-object-injection -- from keys
      result.properties[property] = lhsProperty;
    } else {
      if (lhsProperty == null || rhsProperty == null) {
        // This should never happen, but checking here for type inference
        continue;
      }

      // eslint-disable-next-line security/detect-object-injection -- from keys
      result.properties[property] = unionSchemaDefinitionTypes(
        lhsProperty,
        rhsProperty,
      );
    }
  }

  return result;
}

/**
 * Factory for a minimal JSON Schema for an object. Can be used with RJSF forms and mod options.
 *
 * @see emptyModOptionsDefinitionFactory
 */
export const minimalSchemaFactory: () => Schema = () => ({
  type: "object",
  properties: {},
});

/**
 * Factory for a minimal RJSF UI Schema for an object. Can be used with RJSF forms and mod options.
 *
 * @see emptyModOptionsDefinitionFactory
 */
export const minimalUiSchemaFactory: () => UiSchema = () => ({
  [UI_ORDER]: ["*"],
});
