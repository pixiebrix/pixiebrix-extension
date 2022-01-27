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

/* eslint-disable security/detect-object-injection */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { FieldProps, IChangeEvent } from "@rjsf/core";
import { RJSFSchema, SetActiveField } from "./formBuilderTypes";
import FormPreviewStringField from "./FormPreviewStringField";
import { UI_SCHEMA_ACTIVE } from "./schemaFieldNames";
import { produce } from "immer";
import FormPreviewBooleanField from "./FormPreviewBooleanField";
import { getPreviewValues } from "@/components/fields/fieldUtils";
import ImageCropWidgetPreview from "@/components/formBuilder/ImageCropWidgetPreview";

export type FormPreviewProps = {
  rjsfSchema: RJSFSchema;
  activeField?: string;
  setActiveField: SetActiveField;
};

const FormPreview: React.FC<FormPreviewProps> = ({
  rjsfSchema,
  activeField,
  setActiveField,
}) => {
  const [data, setData] = useState(null);
  const onDataChanged = ({ formData }: IChangeEvent<unknown>) => {
    setData(formData);
  };

  // Maintain a local version of the RJSF schema to reflect the active field
  // Important to have schema and uiSchema always in sync, hence caching both
  const [{ schema, uiSchema }, setLocalRjsfSchema] = useState<RJSFSchema>(
    rjsfSchema
  );

  const previewSchema = useMemo(() => getPreviewValues(schema), [schema]);

  useEffect(() => {
    setData(null);
  }, [rjsfSchema]);

  // Setting local schema
  useEffect(() => {
    if (activeField) {
      const nextLocalRjsfSchema = produce<RJSFSchema>(rjsfSchema, (draft) => {
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
  const BooleanField = useCallback(
    (props: FieldProps) => (
      <FormPreviewBooleanField setActiveField={setActiveField} {...props} />
    ),
    [setActiveField]
  );

  if (!schema || !uiSchema) {
    return null;
  }

  const fields = {
    StringField,
    BooleanField,
  };

  const widgets = {
    imageCrop: ImageCropWidgetPreview,
  };

  return (
    <JsonSchemaForm
      tagName="div"
      formData={data}
      fields={fields}
      widgets={widgets}
      schema={previewSchema}
      uiSchema={uiSchema}
      onChange={onDataChanged}
    >
      <div>
        {/* This <div/> prevents JsonSchemaForm from rendering a Submit button */}
      </div>
    </JsonSchemaForm>
  );
};

export default FormPreview;
