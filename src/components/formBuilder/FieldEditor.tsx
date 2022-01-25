/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { useField } from "formik";
import React, { ChangeEvent, useEffect, useState } from "react";
import styles from "./FieldEditor.module.scss";
import {
  RJSFSchema,
  SelectStringOption,
  SetActiveField,
} from "./formBuilderTypes";
import { UI_WIDGET } from "./schemaFieldNames";
import {
  FIELD_TYPES_WITHOUT_DEFAULT,
  FIELD_TYPE_OPTIONS,
  parseUiType,
  produceSchemaOnPropertyNameChange,
  produceSchemaOnUiTypeChange,
  replaceStringInArray,
  stringifyUiType,
  UiType,
  validateNextPropertyName,
} from "./formBuilderHelpers";
import { Schema, SchemaPropertyType } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import FieldTemplate from "@/components/form/FieldTemplate";
import { produce } from "immer";
import SelectWidget, {
  SelectWidgetOnChange,
} from "@/components/form/widgets/SelectWidget";
import OptionsWidget from "@/components/form/widgets/OptionsWidget";
import SwitchButtonWidget, {
  CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { uniq } from "lodash";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import SchemaField from "@/components/fields/schemaFields/SchemaField";

const imageForCroppingSourceSchema: Schema = {
  type: "string",
  description:
    "The source image data URI: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs",
};

const FieldEditor: React.FC<{
  name: string;
  propertyName: string;
  setActiveField: SetActiveField;
  fieldTypes?: SelectStringOption[];
}> = ({
  name,
  propertyName,
  setActiveField,
  fieldTypes = FIELD_TYPE_OPTIONS,
}) => {
  const [
    { value: rjsfSchema },
    ,
    { setValue: setRjsfSchema },
  ] = useField<RJSFSchema>(name);
  const { schema, uiSchema } = rjsfSchema;
  const fullPropertyName = `${name}.schema.properties.${propertyName}`;
  const [{ value: propertySchema }] = useField<Schema>(fullPropertyName);
  const getFullFieldName = (fieldName: string) =>
    `${fullPropertyName}.${fieldName}`;

  const [internalPropertyName, setInternalPropertyName] = useState<string>("");
  const [propertyNameError, setPropertyNameError] = useState<string>(null);
  useEffect(() => {
    setInternalPropertyName(propertyName);
    setPropertyNameError(null);
  }, [propertyName, schema]);

  const validatePropertyName = (nextName: string) => {
    const error = validateNextPropertyName(schema, propertyName, nextName);

    setPropertyNameError(error);

    return error;
  };

  const onPropertyNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;
    validatePropertyName(nextName);
    setInternalPropertyName(nextName);
  };

  const updatePropertyName = () => {
    const nextName = internalPropertyName;
    if (nextName === propertyName) {
      return;
    }

    const error = validatePropertyName(nextName);
    if (error) {
      return;
    }

    const nextRjsfSchema = produceSchemaOnPropertyNameChange(
      rjsfSchema,
      propertyName,
      nextName
    );
    setRjsfSchema(nextRjsfSchema);
    setActiveField(nextName);
  };

  const onUiTypeChange: SelectWidgetOnChange = (event) => {
    const { value } = event.target;
    if (!value) {
      return;
    }

    const nextRjsfSchema = produceSchemaOnUiTypeChange(
      rjsfSchema,
      propertyName,
      value
    );

    setRjsfSchema(nextRjsfSchema);
  };

  const getSelectedUiTypeOption = () => {
    const propertyType = propertySchema.type as SchemaPropertyType;
    // eslint-disable-next-line security/detect-object-injection
    const uiWidget = uiSchema?.[propertyName]?.[UI_WIDGET];
    const propertyFormat = propertySchema.format;

    const uiType = stringifyUiType({
      propertyType,
      uiWidget,
      propertyFormat,
    });

    const selected = fieldTypes.find((option) => option.value === uiType);

    return selected == null
      ? {
          label: "unknown",
          value: null,
        }
      : selected;
  };

  const onRequiredChange = ({
    target: { value: nextIsRequired },
  }: React.ChangeEvent<CheckBoxLike>) => {
    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      if (!draft.schema.required) {
        draft.schema.required = [];
      }

      if (nextIsRequired) {
        draft.schema.required.push(propertyName);
        draft.schema.required = uniq(draft.schema.required);
      } else {
        draft.schema.required = replaceStringInArray(
          draft.schema.required,
          propertyName
        );
      }
    });

    setRjsfSchema(nextRjsfSchema);
  };

  const isRequired = (schema.required ?? []).includes(propertyName);

  const selectedUiTypeOption = getSelectedUiTypeOption();

  const labelFieldProps: SchemaFieldProps = {
    name: getFullFieldName("title"),
    schema: {
      type: "string",
      description: "The user-visible label for this field",
    },
    label: "Label",
  };
  const descriptionFieldProps: SchemaFieldProps = {
    name: getFullFieldName("description"),
    schema: {
      type: "string",
      description: "Explain to the user what this field is used for",
    },
    label: "Field Description",
  };

  const uiType: UiType =
    selectedUiTypeOption.value == null
      ? {
          propertyType: "null",
          uiWidget: undefined,
          propertyFormat: undefined,
        }
      : parseUiType(selectedUiTypeOption.value);

  const defaultFieldProps: SchemaFieldProps =
    selectedUiTypeOption.value == null
      ? null
      : {
          name: getFullFieldName("default"),
          schema: {
            type: uiType.propertyType,
          },
          label: "Default value",
        };

  return (
    <div className={styles.root}>
      <FieldTemplate
        required
        name={fullPropertyName}
        label="Name"
        value={internalPropertyName}
        onChange={onPropertyNameChange}
        onBlur={updatePropertyName}
        touched
        error={propertyNameError}
        description="Enter a name to refer to this value in the output later"
      />
      <SchemaField {...labelFieldProps} />
      <SchemaField {...descriptionFieldProps} />
      <FieldTemplate
        name={getFullFieldName("uiType")}
        label="Input Type"
        as={SelectWidget}
        blankValue={null}
        options={fieldTypes}
        value={selectedUiTypeOption.value}
        onChange={onUiTypeChange}
      />

      {uiType.uiWidget === "imageCrop" && (
        <SchemaField
          label="Image source"
          name={`${name}.uiSchema.${propertyName}.source`}
          schema={imageForCroppingSourceSchema}
        />
      )}

      {defaultFieldProps &&
        !FIELD_TYPES_WITHOUT_DEFAULT.includes(selectedUiTypeOption.value) && (
          <SchemaField {...defaultFieldProps} />
        )}

      {propertySchema.enum && (
        <ConnectedFieldTemplate
          name={getFullFieldName("enum")}
          label="Options"
          as={OptionsWidget}
        />
      )}

      <FieldTemplate
        name={`${name}.schema.required`}
        label="Required Field?"
        as={SwitchButtonWidget}
        value={isRequired}
        onChange={onRequiredChange}
      />
    </div>
  );
};

export default FieldEditor;
