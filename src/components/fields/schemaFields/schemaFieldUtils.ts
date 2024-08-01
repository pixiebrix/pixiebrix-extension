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

import type React from "react";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { type Schema, type UiSchema } from "@/types/schemaTypes";
import {
  isDatabaseField,
  isIntegrationDependencyField,
} from "@/components/fields/schemaFields/fieldTypeCheckers";
import pipelineSchema from "@schemas/pipeline.json";
import { isEmpty, sortBy } from "lodash";
import { inputProperties } from "@/utils/schemaUtils";

export function makeLabelForSchemaField({
  name,
  label,
  schema: { title },
  hideLabel,
}: SchemaFieldProps): React.ReactNode {
  if (hideLabel) {
    return undefined;
  }

  return label ?? title ?? fieldLabel(name);
}

type FieldConfig = {
  prop: string;
  isRequired?: boolean;
  fieldSchema: Schema;
  propUiSchema: UiSchema;
};

/**
 * Return an array of fields
 * @param schema the inputSchema, e.g., Brick.inputSchema
 * @param uiSchema an optional uiSchema
 * @param preserveSchemaOrder if true, use the inputSchema order if no explicit uiSchema is specified. Otherwise, apply
 * a default sorting based on type and optional fields
 * @param includePipelines if true, include pipeline fields in the output. Otherwise, exclude them
 */
export function sortedFields(
  schema: Schema,
  uiSchema?: UiSchema,
  {
    preserveSchemaOrder = false,
    includePipelines = false,
  }: { preserveSchemaOrder?: boolean; includePipelines?: boolean } = {},
): FieldConfig[] {
  const optionSchema = inputProperties(schema);

  const order = uiSchema?.["ui:order"] ?? ["*"];
  const asteriskIndex = order.indexOf("*");

  const uiSchemaOrder = (field: FieldConfig) => {
    // https://react-jsonschema-form.readthedocs.io/en/docs/usage/objects/#specifying-property-order
    const propIndex = order.indexOf(field.prop);
    const index = propIndex === -1 ? asteriskIndex : propIndex;
    return index === -1 ? order.length : index;
  };

  const fieldTypeOrder = (field: FieldConfig) => {
    // Integration configurations
    if (isIntegrationDependencyField(field.fieldSchema)) {
      return 0;
    }

    // Databases
    if (isDatabaseField(field.fieldSchema)) {
      return 1;
    }

    // Required fields, and fields that will have input values pre-filled
    if (field.isRequired || field.fieldSchema.default != null) {
      return 2;
    }

    // Optional fields that are excluded by default
    return Number.MAX_SAFE_INTEGER;
  };

  // Order by label
  const labelOrder = (field: FieldConfig) =>
    (field.fieldSchema.title ?? field.prop).toLowerCase();

  const fields: FieldConfig[] = Object.entries(optionSchema)
    .filter(
      ([, fieldSchema]) =>
        includePipelines ||
        (typeof fieldSchema === "object" &&
          fieldSchema.$ref !== pipelineSchema.$id),
    )
    .map(([prop, fieldSchema]) => {
      // eslint-disable-next-line security/detect-object-injection -- Fine because coming from Object.entries for the schema
      const propUiSchema = uiSchema?.[prop] as UiSchema;

      return {
        prop,
        isRequired: schema.required?.includes(prop),
        // The fieldSchema type has been filtered so its safe to assume it is Schema
        fieldSchema: fieldSchema as Schema,
        propUiSchema,
      };
    });

  return preserveSchemaOrder && isEmpty(uiSchema)
    ? fields
    : sortBy(fields, uiSchemaOrder, fieldTypeOrder, labelOrder);
}
