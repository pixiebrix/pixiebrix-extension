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

import { type Schema, type UiSchema } from "@/core";
import { isEmpty } from "lodash";

type SchemaProperties = Record<string, Schema>;

type TypePredicate = (schema: Schema) => boolean;

export const textPredicate = (schema: Schema) => schema.type === "string";
export const booleanPredicate = (schema: Schema) => schema.type === "boolean";

export function findOneOf(schema: Schema, predicate: TypePredicate): Schema {
  return schema.oneOf?.find(
    (x) => typeof x === "object" && predicate(x)
  ) as Schema;
}

/**
 * Wrap a JSON Schema as an array schema.
 */
export function arraySchema(itemSchema: Schema): Schema {
  return {
    type: "array",
    items: itemSchema,
  };
}

/**
 * Return as an object schema
 */
export function castSchema(
  schemaOrProperties: Schema | SchemaProperties
): Schema {
  if (schemaOrProperties.type && schemaOrProperties.properties) {
    return schemaOrProperties as Schema;
  }

  return {
    type: "object",
    properties: schemaOrProperties as SchemaProperties,
  };
}

/**
 * A basic comparator function for numbers
 * @param n1 The first number to compare
 * @param n2 The second number to compare
 * @returns 1 if the first number is larger, -1 if it's smaller, 0 if the numbers are equal
 */
function numberComparator(n1: number, n2: number): number {
  if (n1 > n2) {
    return 1;
  }

  if (n2 > n1) {
    return -1;
  }

  return 0;
}

const EMPTY_FIELD_COMPARATOR = (fieldName1: string, fieldName2: string) => 0;

/**
 * Use a UiSchema to build a sorting comparator for schema fields
 * @param uiSchema The UiSchema to use for sorting
 * @returns A comparator function to sort schema fields
 */
export function schemaPropertiesComparator(
  uiSchema: UiSchema | undefined
): (fieldName1: string, fieldName2: string) => number {
  if (!uiSchema) {
    return EMPTY_FIELD_COMPARATOR;
  }

  const uiOrder = uiSchema["ui:order"];
  if (isEmpty(uiOrder)) {
    return EMPTY_FIELD_COMPARATOR;
  }

  const indexMapEntries: Array<[string, number]> = uiOrder.map(
    (fieldName, index) => [fieldName, index]
  );
  const indexMap = new Map(indexMapEntries);

  /**
   * Returns:
   *    -1 if field1 should be sorted before field2
   *    1 if field1 should be sorted after field2
   *    0 if the two fields' sorting is equal
   */
  return (fieldName1, fieldName2) => {
    // Default the index values to the map length, so that anything not in the
    // map receives the same sort index, higher than any index in the map
    const index1 = indexMap.get(fieldName1) ?? indexMap.size;
    const index2 = indexMap.get(fieldName2) ?? indexMap.size;
    return numberComparator(index1, index2);
  };
}
