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

import { Schema, SchemaProperties } from "@/types/schemaTypes";
import { split } from "lodash";

/**
 * Helper method to get the schema of a sub-property. Does not currently handle array indexes or allOf/oneOf/anyOf.
 * @param schema the JSON Schema
 * @param path the property path
 */
export function getSubSchema(schema: Schema, path: string): Schema {
  const parts = split(path, ".");
  let subSchema: Schema | boolean = schema;

  for (const part of parts) {
    if (typeof subSchema === "boolean") {
      throw new TypeError(`Invalid property path: ${path}`);
    }

    // eslint-disable-next-line security/detect-object-injection -- expected that this is called locally
    subSchema = subSchema.properties?.[part];
  }

  if (subSchema == null) {
    throw new TypeError(`Invalid property path: ${path}`);
  }

  if (typeof subSchema === "boolean") {
    throw new TypeError(`Invalid property path: ${path}`);
  }

  return subSchema;
}

/**
 * Return the names of top-level required properties that are missing
 */
export function missingProperties(
  schema: Schema,
  obj: Record<string, any>
): string[] {
  const acc = [];
  for (const propertyKey of schema.required ?? []) {
    const property = schema.properties[propertyKey];
    if (typeof property === "object" && property?.type === "string") {
      const value = obj[propertyKey];
      if ((value ?? "").trim().length === 0) {
        acc.push(propertyKey);
      }
    }
  }

  return acc;
}

export function inputProperties(inputSchema: Schema): SchemaProperties {
  if (typeof inputSchema === "object" && "properties" in inputSchema) {
    return inputSchema.properties;
  }

  return inputSchema as SchemaProperties;
}
