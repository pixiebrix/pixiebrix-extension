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

import React from "react";
import { inputProperties } from "@/helpers";
import { type Schema, type UiSchema } from "@/core";
import { isEmpty, sortBy } from "lodash";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { joinName } from "@/utils";
import pipelineSchema from "@schemas/pipeline.json";
import {
  isDatabaseField,
  isServiceField,
} from "@/components/fields/schemaFields/fieldTypeCheckers";

export type BlockOptionProps = {
  /**
   * The root field name for the block configuration.
   */
  name: string;

  /**
   * The property name of the block configuration -- in general this should be "config"
   * @see BlockConfig
   */
  configKey?: string;
};

const NoOptions: React.FunctionComponent = () => (
  <div>No options available</div>
);

type FieldConfig = {
  prop: string;
  isRequired: boolean;
  fieldSchema: Schema;
  propUiSchema: unknown;
};

export function sortedFields(
  schema: Schema,
  uiSchema: UiSchema | null,
  { preserveSchemaOrder = false }: { preserveSchemaOrder?: boolean } = {}
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
    if (isServiceField(field.fieldSchema)) {
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
        typeof fieldSchema === "object" &&
        fieldSchema.$ref !== pipelineSchema.$id
    )
    .map(([prop, fieldSchema]) => {
      // Fine because coming from Object.entries for the schema
      // eslint-disable-next-line security/detect-object-injection
      const propUiSchema = uiSchema?.[prop];

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

/**
 * Return the Options fields for configuring a block with the given schema.
 *
 * @param schema the JSONSchema for the block configuration
 * @param uiSchema an optional RJSF UISchema for the block configuration
 * @param preserveSchemaOrder if true, preserve order of the schema properties if no uiSchema is provided
 */
function genericOptionsFactory(
  schema: Schema,
  uiSchema: UiSchema = {},
  { preserveSchemaOrder = false }: { preserveSchemaOrder?: boolean } = {}
): React.FunctionComponent<BlockOptionProps> {
  const optionSchema = inputProperties(schema);
  if (isEmpty(optionSchema)) {
    return NoOptions;
  }

  const sortedFieldsConfig = sortedFields(schema, uiSchema, {
    preserveSchemaOrder,
  });

  const OptionsFields = ({ name, configKey }: BlockOptionProps) => (
    <>
      {sortedFieldsConfig.map(
        ({ prop, fieldSchema, propUiSchema, isRequired }) => (
          <SchemaField
            key={prop}
            name={joinName(name, configKey, prop)}
            schema={fieldSchema}
            isRequired={isRequired}
            uiSchema={propUiSchema}
          />
        )
      )}
    </>
  );

  return OptionsFields;
}

export default genericOptionsFactory;
