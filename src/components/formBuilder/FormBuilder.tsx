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
import { useField } from "formik";
import { UI_ORDER } from "./schemaFieldNames";
import ErrorBoundary from "@/components/ErrorBoundary";
import { RJSFSchema } from "./formBuilderTypes";
import { MINIMAL_SCHEMA, MINIMAL_UI_SCHEMA } from "./formBuilderHelpers";
import { produce } from "immer";

const FormBuilder: React.FC<{
  name: string;
}> = ({ name }) => {
  const [
    { value: rjsfSchema },
    ,
    { setValue: setRjsfSchema },
  ] = useField<RJSFSchema>(name);
  const { schema, uiSchema } = rjsfSchema;

  const [activeField, setActiveField] = useState(() => {
    const firstInOrder =
      // eslint-disable-next-line security/detect-object-injection -- is a constant
      uiSchema?.[UI_ORDER]?.length > 1 ? uiSchema[UI_ORDER][0] : undefined;
    if (firstInOrder) {
      return firstInOrder;
    }

    const firstInProperties = Object.keys(schema?.properties || {})[0];
    if (firstInProperties) {
      return firstInProperties;
    }

    return "";
  });

  if (!schema || !uiSchema) {
    const nextRjsfSchema = produce(rjsfSchema, (draft) => {
      if (!draft.schema) {
        draft.schema = MINIMAL_SCHEMA;
      }

      if (!draft.uiSchema) {
        draft.uiSchema = MINIMAL_UI_SCHEMA;
      }
    });
    setRjsfSchema(nextRjsfSchema);

    return null;
  }

  return (
    <div className="d-flex">
      <div className="flex-grow-1 mr-3">
        <FormEditor
          name={name}
          activeField={activeField}
          setActiveField={setActiveField}
        />
      </div>
      <div className="flex-grow-1 mr-3">
        <ErrorBoundary>
          <FormPreview
            name={name}
            activeField={activeField}
            setActiveField={setActiveField}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default FormBuilder;
