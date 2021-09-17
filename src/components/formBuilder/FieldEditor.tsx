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
import { Field, useField, useFormikContext } from "formik";
import React, { ChangeEvent, useEffect, useState } from "react";
import styles from "./FieldEditor.module.scss";
import {
  RJSFSchema,
  SelectStringOption,
  SetActiveField,
} from "./formBuilderTypes";
import { Row, Form as BootstrapForm, Col } from "react-bootstrap";
import Select from "react-select";
import { UI_ORDER, UI_WIDGET } from "./schemaFieldNames";
import {
  FIELD_TYPE_OPTIONS,
  parseUiType,
  replaceStringInArray,
  stringifyUiType,
} from "./formBuilderHelpers";
import { Schema, UiSchema } from "@/core";
import { uniq } from "lodash";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import FieldTemplate from "@/components/form/FieldTemplate";

const FieldEditor: React.FC<{
  name: string;
  propertyName: string;
  setActiveField: SetActiveField;
}> = ({ name, propertyName, setActiveField }) => {
  const { setFieldValue } = useFormikContext<RJSFSchema>();
  const [{ value: schema }, , { setValue: setSchema }] = useField<Schema>(
    `${name}.schema`
  );
  const [{ value: uiSchema }, , { setValue: setUiSchema }] = useField<UiSchema>(
    `${name}.uiSchema`
  );
  const [{ value: propertySchema }] = useField(
    `${name}.schema.properties.${propertyName}`
  );
  const [{ value: propertyUiSchema }] = useField(
    `${name}.uiSchema.${propertyName}`
  );

  const [propertyNameError, setPropertyNameError] = useState<string>(null);
  useEffect(() => {
    setPropertyNameError(null);
  }, [propertyName, schema]);

  const getFullFieldName = (fieldName: string) =>
    `${name}.schema.properties.${propertyName}.${fieldName}`;
  const getFullUiFieldName = (fieldName: string) =>
    `${name}.uiSchema.${propertyName}.${fieldName}`;

  const onPropertyNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;

    // Validation
    if (nextName === "") {
      setPropertyNameError("Name cannot be empty.");
      return;
    }

    if (nextName.includes(".")) {
      setPropertyNameError("Name must not contain periods.");
      return;
    }

    const existingProperties = Object.keys(schema.properties);
    if (existingProperties.includes(nextName)) {
      setPropertyNameError(
        `Name must be unique. Another property "${
          (schema.properties[nextName] as Schema).title
        }" already has the name "${nextName}".`
      );
      return;
    }

    if (propertyNameError) {
      setPropertyNameError(null);
    }

    const nextSchemaProperties = { ...schema.properties };
    nextSchemaProperties[nextName] = nextSchemaProperties[propertyName];
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete nextSchemaProperties[propertyName];

    const nextSchema: Schema = {
      ...schema,
      properties: nextSchemaProperties,
    };

    const uiOrder: string[] = uiSchema[UI_ORDER];
    const nextUiOrder = uniq(
      replaceStringInArray(uiOrder, propertyName, nextName)
    );
    const nextUiSchema: UiSchema = {
      ...uiSchema,
      [UI_ORDER]: nextUiOrder,
    };

    setSchema(nextSchema);
    setUiSchema(nextUiSchema);
    setActiveField(nextName);
  };

  const onUiTypeChange = ({ value }: SelectStringOption) => {
    if (!value) {
      return;
    }

    const { propertyType, uiWidget, propertyFormat } = parseUiType(value);
    setFieldValue(getFullFieldName("type"), propertyType);
    setFieldValue(getFullFieldName("format"), propertyFormat);
    setFieldValue(getFullUiFieldName(UI_WIDGET), uiWidget);
  };

  const getSelectedUiTypeOption = () => {
    const propertyType = propertySchema.type;
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

  return (
    <div className={styles.active}>
      <FieldTemplate
        required
        name={`${name}.${propertyName}`}
        label="Name"
        value={propertyName}
        onChange={onPropertyNameChange}
        touched
        error={propertyNameError}
      />
      <ConnectedFieldTemplate name={getFullFieldName("title")} label="Label" />
      <ConnectedFieldTemplate
        name={getFullFieldName("description")}
        label="Help text"
      />
      <ConnectedFieldTemplate
        name={getFullFieldName("default")}
        label="Default value"
      />

      <BootstrapForm.Group as={Row}>
        <BootstrapForm.Label column sm="3">
          Type
        </BootstrapForm.Label>
        <Col sm="9" className={styles.fieldColumn}>
          <Select
            className={styles.select}
            name={getFullFieldName("uiType")}
            options={FIELD_TYPE_OPTIONS}
            value={getSelectedUiTypeOption()}
            onChange={onUiTypeChange}
          />
        </Col>
      </BootstrapForm.Group>

      <BootstrapForm.Group as={Row}>
        <BootstrapForm.Label column sm="3">
          Required
        </BootstrapForm.Label>
        <Col sm="9" className={styles.fieldColumn}>
          <Field
            type="checkbox"
            name={`${name}.schema.required`}
            value={propertyName}
          />
        </Col>
      </BootstrapForm.Group>
    </div>
  );
};

export default FieldEditor;
