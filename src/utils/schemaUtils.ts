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
  type Schema,
  type SchemaDefinition,
  type SchemaProperties,
} from "@/types/schemaTypes";
import { castArray, intersection, isEmpty, split, uniq } from "lodash";
import { isNullOrBlank } from "@/utils/stringUtils";

/**
 * Helper method to get the schema of a sub-property. Does not currently handle array indexes or allOf/oneOf/anyOf.
 * @param schema the JSON Schema
 * @param path the property path
 */
export function getSubSchema(schema: Schema, path: string): Schema {
  const parts = split(path, ".");
  let subSchema: Schema = schema;

  for (const part of parts) {
    // eslint-disable-next-line security/detect-object-injection -- expected that this is called locally
    const nextSubSchema = subSchema.properties?.[part];

    if (typeof nextSubSchema === "boolean" || nextSubSchema == null) {
      throw new TypeError(`Invalid property path: ${path}`);
    }

    subSchema = nextSubSchema;
  }

  return subSchema;
}

/**
 * Return the names of top-level required properties that are missing or blank in an object.
 */
export function missingProperties(
  schema: Schema,
  obj: Record<string, unknown>,
): string[] {
  const acc = [];
  for (const propertyKey of schema.required ?? []) {
    const property = schema.properties?.[propertyKey];
    if (typeof property === "object" && property?.type === "string") {
      const value = obj[propertyKey];
      if (isNullOrBlank(value)) {
        acc.push(propertyKey);
      }
    }
  }

  return acc;
}

/**
 * Return the names of top-level properties in a JSON Schema or object.
 * @param inputSchema the schema or object
 */
export function inputProperties(inputSchema: Schema): SchemaProperties {
  if (
    typeof inputSchema === "object" &&
    "properties" in inputSchema &&
    inputSchema.properties != null
  ) {
    return inputSchema.properties;
  }

  return inputSchema as SchemaProperties;
}

/**
 * Returns true if the schema uses anyOf/oneOf/allOf/not.
 * @param schema the JSON Schema
 */
export function isComplexSchema(schema: Schema): boolean {
  // https://json-schema.org/understanding-json-schema/reference/combining.html
  return (
    Boolean(schema.anyOf) ||
    Boolean(schema.oneOf) ||
    Boolean(schema.allOf) ||
    Boolean(schema.not)
  );
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
