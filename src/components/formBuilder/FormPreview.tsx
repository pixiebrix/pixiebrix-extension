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
import { RJSFSchema, SetActiveField } from "./formBuilderTypes";
import FormPreviewStringField from "./FormPreviewStringField";
import { useField } from "formik";
import { UI_ORDER, UI_SCHEMA_ACTIVE } from "./schemaFieldNames";
import { Card } from "react-bootstrap";
import ErrorBoundary from "@/components/ErrorBoundary";
import { produce } from "immer";

const FormPreview: React.FC<{
  name: string;
  activeField?: string;
  setActiveField: SetActiveField;
}> = ({ name, activeField, setActiveField }) => {
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

  useEffect(() => {
    setData(null);
  }, [rjsfSchema]);

  useEffect(() => {
    const { schema, uiSchema } = rjsfSchema;
    const firstInOrder =
      // eslint-disable-next-line security/detect-object-injection -- is a constant
      uiSchema?.[UI_ORDER]?.length > 1 ? uiSchema[UI_ORDER][0] : undefined;
    if (firstInOrder && firstInOrder !== "*") {
      setActiveField(firstInOrder);
      return;
    }

    const firstInProperties = Object.keys(schema?.properties || {})[0];
    if (firstInProperties) {
      setActiveField(firstInProperties);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetting activeField only on new name
  }, [name]);

  // Setting local schema
  useEffect(() => {
    if (activeField) {
      const nextLocalRjsfSchema = produce(rjsfSchema, (draft) => {
        if (!draft.uiSchema[activeField]) {
          draft.uiSchema[activeField] = {};
        }

        draft.uiSchema[activeField][UI_SCHEMA_ACTIVE] = true;
      });

      setLocalRjsfSchema(nextLocalRjsfSchema);
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
        <ErrorBoundary>
          {Boolean(localRjsfSchema.schema) &&
            Boolean(localRjsfSchema.uiSchema) && (
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
            )}
        </ErrorBoundary>
      </Card.Body>
    </Card>
  );
};

export default FormPreview;
