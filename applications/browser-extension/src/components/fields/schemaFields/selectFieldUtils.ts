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

import { type Schema } from "../../../types/schemaTypes";
import { isLabelledEnumField } from "./fieldTypeCheckers";
import { compact, uniqBy } from "lodash";
import { type StringOptionsType } from "./widgets/SchemaSelectWidget";

/**
 * Return the options for a SelectWidget based on the schema and user input.
 * @param schema the JSONSchema for the field
 * @param value the current value of the field, to ensure an option exists for it
 * @param created the values the user has created
 */
export function mapSchemaToOptions({
  schema,
  value,
  created = [],
}: {
  schema: Pick<Schema, "examples" | "enum" | "type" | "oneOf">;
  value?: string;
  created?: string[];
}): {
  creatable: boolean;
  options: StringOptionsType;
} {
  if (schema.type !== "string") {
    // Should never hit this, because SchemaSelectWidget should only be rendered for string fields
    return {
      creatable: false,
      options: [],
    };
  }

  const primitiveValues = schema.examples ?? schema.enum;

  const schemaOptions = isLabelledEnumField(schema)
    ? schema.oneOf.map((x) => ({ value: x.const, label: x.title ?? x.const }))
    : Array.isArray(primitiveValues)
      ? primitiveValues.map((value: string) => ({ value, label: value }))
      : [];

  const userOptions = compact([value, ...created])
    .filter(
      (value) =>
        !schemaOptions.some((schemaOption) => value === schemaOption.value),
    )
    .map((value) => ({
      value,
      label: value,
    }));

  return {
    creatable: Boolean(schema.examples),
    options: uniqBy([...userOptions, ...schemaOptions], "value"),
  };
}
