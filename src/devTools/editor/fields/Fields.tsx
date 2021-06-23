/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { Form } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import SelectorSelectorField from "./SelectorSelectorField";
import { IRenderContext } from "@/components/fields/blockOptions";
import { Schema } from "@/core";

export const SelectorRenderer: React.FunctionComponent<FieldProps<string>> = ({
  label,
  schema,
  ...props
}) => {
  const [field, meta] = useField(props);
  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <SelectorSelectorField isClearable sort name={field.name} />
      {schema.description && (
        <Form.Text className="text-muted">{schema.description}</Form.Text>
      )}
      {meta.touched && meta.error && (
        <Form.Control.Feedback type="invalid">
          {meta.error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

export const SelectorControl: React.FunctionComponent<{ name: string }> = ({
  name,
}) => <SelectorSelectorField isClearable sort name={name} />;

const devtoolFields: IRenderContext = {
  customRenderers: [
    {
      match: (fieldSchema: Schema) =>
        fieldSchema.type === "string" && fieldSchema.format === "selector",
      Component: SelectorRenderer,
    },
  ],
  customControls: [
    {
      match: (fieldSchema: Schema) =>
        fieldSchema.type === "string" && fieldSchema.format === "selector",
      Component: SelectorControl,
    },
  ],
};

export default devtoolFields;
