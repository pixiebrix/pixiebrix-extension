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
import { Schema } from "@/core";
import { FieldProps, IChangeEvent, ISubmitEvent, UiSchema } from "@rjsf/core";
import { SetActiveField } from "./formBuilderTypes";
import FormPreviewStingField, {
  UI_SCHEMA_ACTIVE,
} from "./FormPreviewStingField";

const FormPreview: React.FC<{
  schema: Schema;
  onSubmit: (
    e: ISubmitEvent<unknown>,
    nativeEvent: React.FormEvent<HTMLFormElement>
  ) => void;
  activeField?: string;
  setActiveField: SetActiveField;
}> = ({ schema, onSubmit, activeField, setActiveField }) => {
  const [data, setData] = useState(null);
  const onDataChanged = ({ formData }: IChangeEvent<unknown>) => {
    setData(formData);
  };

  useEffect(() => {
    setData(null);
  }, [schema]);

  const StringField = useCallback(
    (props: FieldProps) => (
      <FormPreviewStingField setActiveField={setActiveField} {...props} />
    ),
    [setActiveField]
  );

  const fields = {
    StringField,
  };

  const uiSchema: UiSchema = {};
  if (activeField) {
    uiSchema[activeField] = {
      [UI_SCHEMA_ACTIVE]: true,
    };
  }

  return (
    <JsonSchemaForm
      formData={data}
      fields={fields}
      schema={{ ...schema }}
      uiSchema={uiSchema}
      onChange={onDataChanged}
      onSubmit={onSubmit}
    />
  );
};

export default FormPreview;
