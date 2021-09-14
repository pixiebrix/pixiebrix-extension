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
import React, { ChangeEvent } from "react";
import FormikHorizontalField from "@/components/form/fields/FormikHorizontalField";
import HorizontalField from "@/components/form/fields/HorizontalField";
import styles from "./FieldEditor.module.scss";
import { FORM_FIELD_TYPES, SetActiveField } from "./formBuilderTypes";
import { Row, Form as BootstrapForm, Col } from "react-bootstrap";
import Select from "react-select";
import { UI_ORDER } from "./schemaFieldNames";
import { replaceStringInArray } from "./formBuilderHelpers";
import { UiSchema } from "@rjsf/core";
import { Schema } from "js-yaml";

const FieldEditor: React.FC<{
  name: string;
  propertyName: string;
  setActiveField: SetActiveField;
}> = ({ name, propertyName, setActiveField }) => {
  const [{ value }, , { setValue }] = useField<{
    schema: Schema;
    uiSchema: UiSchema;
  }>(name);
  const [
    { value: schemaProperties },
    ,
    { setValue: setSchemaProperties },
  ] = useField(`${name}.schema.properties`);
  const [{ value: uiSchema }, , { setValue: setUiSchema }] = useField<UiSchema>(
    `${name}.uiSchema`
  );
  const [
    { value: propertySchema },
    ,
    { setValue: setPropertySchema },
  ] = useField(`${name}.schema.properties.${propertyName}`);
  const [
    { value: propertyUiSchema },
    ,
    { setValue: setPropertyUiSchema },
  ] = useField(`${name}.uiSchema.${propertyName}`);

  const onFieldNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;

    const nextSchemaProperties = { ...schemaProperties };
    // eslint-disable-next-line security/detect-object-injection
    nextSchemaProperties[nextName] = nextSchemaProperties[propertyName];
    // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-dynamic-delete
    delete nextSchemaProperties[propertyName];

    const nextSchema: Schema = {
      ...value.schema,
      properties: nextSchemaProperties,
    };

    // eslint-disable-next-line security/detect-object-injection
    const uiOrder: string[] = uiSchema[UI_ORDER];
    const nextUiOrder = replaceStringInArray(uiOrder, propertyName, nextName);
    const nextUiSchema: UiSchema = {
      ...uiSchema,
      [UI_ORDER]: nextUiOrder,
    };

    setValue({
      schema: nextSchema,
      uiSchema: nextUiSchema,
    });
    setActiveField(nextName);
  };

  const getFullFieldName = (fieldName: string) =>
    `${name}.schema.properties.${propertyName}.${fieldName}`;

  const onPropertyTypeChange = ({
    value,
  }: {
    label: string;
    value: string;
  }) => {
    if (value === propertySchema.type) {
      return;
    }

    const { title } = propertySchema;
    setPropertySchema({
      title,
      type: value,
    });
    if (propertyUiSchema) {
      setPropertyUiSchema(null);
    }
  };

  const typeSelectOptions = FORM_FIELD_TYPES.map((fieldType) => ({
    label: fieldType,
    value: fieldType,
  }));

  return (
    <div className={styles.active}>
      <HorizontalField
        name={`${name}.${propertyName}`}
        label="Field name"
        value={propertyName}
        onChange={onFieldNameChange}
      />
      <FormikHorizontalField name={getFullFieldName("title")} label="Title" />

      <BootstrapForm.Group as={Row}>
        <BootstrapForm.Label column sm="3">
          Type
        </BootstrapForm.Label>
        <Col sm="9">
          <Select
            name={getFullFieldName("type")}
            options={typeSelectOptions}
            value={typeSelectOptions.find(
              (x) => x.value === propertySchema.type
            )}
            onChange={onPropertyTypeChange}
          />
        </Col>
      </BootstrapForm.Group>
    </div>
  );
};

export default FieldEditor;
