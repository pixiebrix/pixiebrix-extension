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

import React from "react";
import { inputProperties } from "@/helpers";
import { type Schema, type UiSchema } from "@/types/schemaTypes";
import { isEmpty } from "lodash";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { joinName } from "@/utils";
import { sortedFields } from "@/components/fields/schemaFields/schemaFieldUtils";

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
  <div>This brick does not require any configuration</div>
);

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
