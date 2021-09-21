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
import React, { useCallback, useEffect, useState } from "react";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { FieldProps, IChangeEvent } from "@rjsf/core";
import { RJSFSchema } from "./formBuilderTypes";
import FormPreviewStringField from "./FormPreviewStringField";
import { useField } from "formik";
import { UI_SCHEMA_ACTIVE } from "./schemaFieldNames";
import { Card } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/devTools/store";
import { actions } from "@/devTools/editor/slices/formBuilderSlice";

const FormPreview: React.FC<{
  name: string;
}> = ({ name }) => {
  const [{ value: rjsfSchema }] = useField<RJSFSchema>(name);

  const [data, setData] = useState(null);
  const onDataChanged = ({ formData }: IChangeEvent<unknown>) => {
    setData(formData);
  };

  // Maintain a local version of the RJSF schema to reflect the active field
  // Important to have schema and uiSchema always in sync, hence caching both
  const [localRjsfSchema, setLocalRjsfSchema] = useState<RJSFSchema>(
    rjsfSchema
  );

  const activeField = useSelector(
    (rootState: RootState) => rootState.formBuilder.activeField
  );
  const dispatch = useDispatch();
  const setActiveField = useCallback(
    (activeField: string) => {
      dispatch(actions.setActiveField(activeField));
    },
    [dispatch]
  );

  useEffect(() => {
    setData(null);
  }, [rjsfSchema]);

  useEffect(() => {
    if (activeField) {
      const uiSchema = { ...rjsfSchema.uiSchema };
      uiSchema[activeField] = {
        ...uiSchema[activeField],
        [UI_SCHEMA_ACTIVE]: true,
      };
      setLocalRjsfSchema({
        schema: rjsfSchema.schema,
        uiSchema,
      });
    } else {
      setLocalRjsfSchema(rjsfSchema);
    }
  }, [activeField, rjsfSchema]);

  const StringField = useCallback(
    (props: FieldProps) => (
      <FormPreviewStringField setActiveField={setActiveField} {...props} />
    ),
    [setActiveField]
  );

  const fields = {
    StringField,
  };

  return (
    <Card>
      <Card.Header>Preview</Card.Header>
      <Card.Body>
        <JsonSchemaForm
          tagName="div"
          formData={data}
          fields={fields}
          schema={localRjsfSchema.schema}
          uiSchema={localRjsfSchema.uiSchema}
          onChange={onDataChanged}
        >
          <div></div>
        </JsonSchemaForm>
      </Card.Body>
    </Card>
  );
};

export default FormPreview;
