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

import { Schema, UiSchema } from "@/core";
import { FieldArray, Formik, useField } from "formik";
import React, { useEffect, useState } from "react";
import { FormConfig, SetActiveField } from "./formBuilderTypes";
import { Button, Form as BootstrapForm } from "react-bootstrap";
import {
  buildFormConfigFromSchema,
  buildFormSchemaFromConfig,
} from "./formBuilderHelpers";
import FormikHorizontalField from "@/components/form/fields/FormikHorizontalField";
import FieldEditor from "./FieldEditor";

const uiOrderProperty = "ui:order";

const FormEditor: React.FC<{
  name: string;
  activeField?: string;
  setActiveField: SetActiveField;
}> = ({ name, activeField, setActiveField }) => {
  const [{ value: schema }] = useField<Schema>(`${name}.schema`);
  const [{ value: uiSchema }, , { setValue: setUiSchema }] = useField<UiSchema>(
    `${name}.uiSchema`
  );

  useEffect(() => {
    // Set uiSchema order if needed
    if (!uiSchema[uiOrderProperty]) {
      const properyKeys = Object.keys(schema.properties);
      setUiSchema({ ...uiSchema, [uiOrderProperty]: properyKeys });
    }
  }, [schema, uiSchema]);

  const propertyNameToShow = activeField || Object.keys(schema.properties)[0];

  return (
    <div>
      <BootstrapForm.Group>
        <h5>Edit form</h5>
        <hr />
      </BootstrapForm.Group>
      <FormikHorizontalField name={`${name}.schema.title`} label="Title" />
      <FormikHorizontalField
        name={`${name}.schema.description`}
        label="Description"
      />
      <BootstrapForm.Group>
        <h6>Edit fields</h6>
        <hr />
      </BootstrapForm.Group>
      {/* eslint-disable-next-line security/detect-object-injection */}
      {propertyNameToShow && Boolean(schema.properties[propertyNameToShow]) && (
        <FieldEditor name={name} fieldName={propertyNameToShow} />
      )}
    </div>
  );
};

export default FormEditor;
