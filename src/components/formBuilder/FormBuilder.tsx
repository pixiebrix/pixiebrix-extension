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
import React, { useState } from "react";
import FormEditor from "./FormEditor";
import FormPreview from "./FormPreview";
import { useField } from "formik";
import { UI_ORDER } from "./schemaFieldNames";
import ErrorBoundary from "@/components/ErrorBoundary";
import { RJSFSchema } from "./formBuilderTypes";

const FormBuilder: React.FC<{
  name: string;
}> = ({ name }) => {
  const [
    {
      value: { schema, uiSchema },
    },
  ] = useField<RJSFSchema>(name);

  const [activeField, setActiveField] = useState(() => {
    const firstInOrder = uiSchema?.[UI_ORDER]?.[0];
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
    return <div>Schema and UiSchema are required</div>;
  }

  return (
    <div className="d-flex">
      <div className="m-5">
        <FormEditor
          name={name}
          activeField={activeField}
          setActiveField={setActiveField}
        />
      </div>
      <div className="m-5">
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
