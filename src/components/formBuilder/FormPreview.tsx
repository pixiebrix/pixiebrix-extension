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

import React, { useCallback, useEffect, useState } from "react";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { FieldProps, IChangeEvent, UiSchema } from "@rjsf/core";
import { SetActiveField } from "./formBuilderTypes";
import FormPreviewStingField from "./FormPreviewStingField";
import { useField } from "formik";
import { UI_SCHEMA_ACTIVE } from "./schemaFieldNames";

const FormPreview: React.FC<{
  name: string;
  activeField?: string;
  setActiveField: SetActiveField;
}> = ({ name, activeField, setActiveField }) => {
  const [data, setData] = useState(null);
  const onDataChanged = ({ formData }: IChangeEvent<unknown>) => {
    setData(formData);
  };

  const [
    uiSchemaWithActiveField,
    setUiSchemaWithActiveField,
  ] = useState<UiSchema>({});

  const [
    {
      value: { schema, uiSchema },
    },
  ] = useField(name);

  useEffect(() => {
    setData(null);
  }, [schema, uiSchema]);

  useEffect(() => {
    if (activeField) {
      const localUiSchema = { ...uiSchema };
      localUiSchema[activeField] = {
        ...localUiSchema[activeField],
        [UI_SCHEMA_ACTIVE]: true,
      };
      setUiSchemaWithActiveField(localUiSchema);
    } else {
      setUiSchemaWithActiveField(uiSchema);
    }
  }, [activeField, uiSchema]);

  const StringField = useCallback(
    (props: FieldProps) => (
      <FormPreviewStingField setActiveField={setActiveField} {...props} />
    ),
    [setActiveField]
  );

  const fields = {
    StringField,
  };

  return (
    <JsonSchemaForm
      tagName="div"
      formData={data}
      fields={fields}
      schema={schema}
      uiSchema={uiSchemaWithActiveField}
      onChange={onDataChanged}
    >
      <div></div>
    </JsonSchemaForm>
  );
};

export default FormPreview;
