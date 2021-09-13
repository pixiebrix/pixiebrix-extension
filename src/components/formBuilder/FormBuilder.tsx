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

import React, { useState } from "react";
import FormEditor from "./FormEditor";
import FormPreview from "./FormPreview";
import { Schema } from "@/core";

type OnSchemaChanged = (schema: Schema) => void;

const FormBuilder: React.FC<{
  schema: Schema;
  onChange: OnSchemaChanged;
  onSave: OnSchemaChanged;
  onPreviewSubmitted?: (formData: unknown) => void;
}> = ({ schema: initialSchema, onChange, onSave, onPreviewSubmitted }) => {
  const [schema, setSchema] = useState(initialSchema);
  const [activeField, setActiveField] = useState("");

  return (
    <div className="d-flex">
      <div className="m-5">
        <FormEditor
          currentSchema={schema}
          onSchemaChanged={(schema) => {
            setSchema(schema);
            onChange(schema);
          }}
          onSave={(schema) => {
            setSchema(schema);
            onSave(schema);
          }}
          activeField={activeField}
          setActiveField={setActiveField}
        />
      </div>
      <div className="m-5">
        <FormPreview
          schema={schema}
          onSubmit={({ formData }) => {
            if (onPreviewSubmitted) {
              onPreviewSubmitted(formData);
            }
          }}
          activeField={activeField}
          setActiveField={setActiveField}
        />
      </div>
    </div>
  );
};

export default FormBuilder;
