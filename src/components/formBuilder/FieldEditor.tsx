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

/* eslint-disable security/detect-object-injection */
import { useField } from "formik";
import React, { ChangeEvent, useEffect, useState } from "react";
import styles from "./FieldEditor.module.scss";
import { RJSFSchema, SetActiveField } from "./formBuilderTypes";
import { UI_ORDER, UI_WIDGET } from "./schemaFieldNames";
import {
  FIELD_TYPES_WITHOUT_DEFAULT,
  FIELD_TYPE_OPTIONS,
  parseUiType,
  replaceStringInArray,
  stringifyUiType,
} from "./formBuilderHelpers";
import { Schema, SchemaPropertyType } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import FieldTemplate from "@/components/form/FieldTemplate";
import { produce } from "immer";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import OptionsWidget from "@/components/form/widgets/OptionsWidget";
import { CheckBoxLike } from "@/components/form/switchButton/SwitchButton";
import { uniq } from "lodash";

const FieldEditor: React.FC<{
  name: string;
  propertyName: string;
  setActiveField: SetActiveField;
}> = ({ name, propertyName, setActiveField }) => {
  const [
    { value: rjsfSchema },
    ,
    { setValue: setRjsfSchema },
  ] = useField<RJSFSchema>(name);
  const { schema } = rjsfSchema;
  const [{ value: propertySchema }] = useField<Schema>(
    `${name}.schema.properties.${propertyName}`
  );
  const [{ value: propertyUiSchema }] = useField(
    `${name}.uiSchema.${propertyName}`
  );

  const getFullFieldName = (fieldName: string) =>
    `${name}.schema.properties.${propertyName}.${fieldName}`;

  const [internalPropertyName, setInternalPropertyName] = useState<string>(
    null
  );
  const [propertyNameError, setPropertyNameError] = useState<string>(null);
  useEffect(() => {
    setInternalPropertyName(propertyName);
    setPropertyNameError(null);
  }, [propertyName, schema]);

  const validatePropertyName = (nextName: string) => {
    let error: string = null;

    if (nextName !== propertyName) {
      if (nextName === "") {
        error = "Name cannot be empty.";
      }

      if (nextName.includes(".")) {
        error = "Name must not contain periods.";
      }

      const existingProperties = Object.keys(schema.properties);
      if (existingProperties.includes(nextName)) {
        error = `Name must be unique. Another property "${
          (schema.properties[nextName] as Schema).title
        }" already has the name "${nextName}".`;
      }
    }

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

    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      draft.schema.properties[nextName] = draft.schema.properties[propertyName];
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete draft.schema.properties[propertyName];

      if (draft.schema.required?.includes(propertyName)) {
        draft.schema.required = replaceStringInArray(
          draft.schema.required,
          propertyName,
          nextName
        );
      }

      const nextUiOrder = replaceStringInArray(
        draft.uiSchema[UI_ORDER],
        propertyName,
        nextName
      );
      draft.uiSchema[UI_ORDER] = nextUiOrder;
    });
    setRjsfSchema(nextRjsfSchema);
    setActiveField(nextName);
  };

  const onUiTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (!value) {
      return;
    }

    const { propertyType, uiWidget, propertyFormat } = parseUiType(value);
    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      const draftPropertySchema = draft.schema.properties[
        propertyName
      ] as Schema;
      draftPropertySchema.type = propertyType;

      if (propertyFormat) {
        draftPropertySchema.format = propertyFormat;
      } else {
        delete draftPropertySchema.format;
      }

      if (
        propertySchema.type !== propertyType ||
        propertySchema.format !== propertyFormat
      ) {
        delete draftPropertySchema.default;
      }

      if (uiWidget) {
        if (!draft.uiSchema[propertyName]) {
          draft.uiSchema[propertyName] = {};
        }

        draft.uiSchema[propertyName][UI_WIDGET] = uiWidget;
      } else if (draft.uiSchema[propertyName]) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete draft.uiSchema[propertyName][UI_WIDGET];
      }

      if (uiWidget === "select") {
        draftPropertySchema.enum = [];
      } else {
        delete draftPropertySchema.enum;
      }
    });

    setRjsfSchema(nextRjsfSchema);
  };

  const getSelectedUiTypeOption = () => {
    const propertyType = propertySchema.type as SchemaPropertyType;
    const uiWidget = propertyUiSchema ? propertyUiSchema[UI_WIDGET] : undefined;
    const propertyFormat = propertySchema.format;

    const uiType = stringifyUiType({
      propertyType,
      uiWidget,
      propertyFormat,
    });

    const selected = FIELD_TYPE_OPTIONS.find(
      (option) => option.value === uiType
    );

    return selected === null
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

  return (
    <div className={styles.root}>
      <FieldTemplate
        required
        name={`${name}.${propertyName}`}
        label="Name"
        value={internalPropertyName}
        onChange={onPropertyNameChange}
        onBlur={updatePropertyName}
        touched
        error={propertyNameError}
        description="Enter a name to refer to this value in the output later"
      />
      <ConnectedFieldTemplate
        name={getFullFieldName("title")}
        label="Label"
        description="The user-visible label for this field"
      />
      <ConnectedFieldTemplate
        name={getFullFieldName("description")}
        label="Field Description"
        description="Explain to the user what this field is used for"
      />
      <FieldTemplate
        name={getFullFieldName("uiType")}
        label="Input Type"
        as={SelectWidget}
        blankValue={null}
        options={FIELD_TYPE_OPTIONS}
        value={selectedUiTypeOption.value}
        onChange={onUiTypeChange}
      />

      {!FIELD_TYPES_WITHOUT_DEFAULT.includes(selectedUiTypeOption.value) && (
        <ConnectedFieldTemplate
          name={getFullFieldName("default")}
          label="Default value"
          type={parseUiType(selectedUiTypeOption.value).propertyType}
        />
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
        layout="switch"
        value={isRequired}
        onChange={onRequiredChange}
      />
    </div>
  );
};

export default FieldEditor;
