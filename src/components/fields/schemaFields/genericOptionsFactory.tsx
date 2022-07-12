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

import React, { memo } from "react";
import { inputProperties } from "@/helpers";
import { Schema, UiSchema } from "@/core";
import { cloneDeep, isEmpty } from "lodash";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { joinName } from "@/utils";
import pipelineSchema from "@schemas/pipeline.json";
import * as Yup from "yup";
import { buildYup } from "schema-to-yup";

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

/**
 * Return the Options fields for configuring a block with the given schema.
 */
function genericOptionsFactory(
  schema: Schema,
  uiSchema?: UiSchema,
  validationSchema?: Yup.ObjectSchema<any>
): React.FunctionComponent<BlockOptionProps> {
  const optionSchema = inputProperties(schema);
  if (isEmpty(optionSchema)) {
    return NoOptions;
  }

  const fieldsConfig = Object.entries(optionSchema)
    .filter(
      ([, fieldSchema]) =>
        typeof fieldSchema === "object" &&
        fieldSchema.$ref !== pipelineSchema.$id
    )
    .map(([prop, fieldSchema]) => {
      let propValidationSchema: Yup.ObjectSchema<any>;
      if (validationSchema != null) {
        try {
          propValidationSchema = Yup.reach(validationSchema, prop);
        } catch (error) {
          // It's ok if a property doesn't have a validation schema
          console.debug("Error picking property schema", {
            prop,
            fieldSchema,
            error,
          });
        }
      }

      // Fine because coming from Object.entries for the schema
      // eslint-disable-next-line security/detect-object-injection
      const propUiSchema = uiSchema?.[prop];

      return {
        prop,
        fieldSchema,
        propUiSchema,
        propValidationSchema,
      };
    });

  const OptionsFields = ({ name, configKey }: BlockOptionProps) => (
    <>
      {fieldsConfig.map(
        ({ prop, fieldSchema, propUiSchema, propValidationSchema }) => (
          <SchemaField
            key={prop}
            name={joinName(name, configKey, prop)}
            // The fieldSchema type has been filtered and is safe to assume it is Schema
            schema={fieldSchema as Schema}
            isRequired={schema.required?.includes(prop)}
            uiSchema={propUiSchema}
            validationSchema={propValidationSchema}
          />
        )
      )}
    </>
  );

  return OptionsFields;
}

export default genericOptionsFactory;
