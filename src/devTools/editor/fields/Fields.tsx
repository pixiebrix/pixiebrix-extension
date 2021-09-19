/* eslint-disable filenames/match-exported */
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

import React from "react";
import { SchemaFieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { Form } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import SelectorSelectorField from "./SelectorSelectorField";
import { IRenderContext } from "@/components/fields/blockOptions";
import { Schema } from "@/core";

export const SelectorRenderer: React.FunctionComponent<
  SchemaFieldProps<string>
> = ({ label, schema, ...props }) => {
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

function isSelectorField(fieldSchema: Schema): boolean {
  if (fieldSchema.type === "string" && fieldSchema.format === "selector") {
    return true;
  }

  if (
    (fieldSchema.oneOf ?? []).some(
      (x) => typeof x !== "boolean" && isSelectorField(x)
    )
  ) {
    return true;
  }

  if (
    (fieldSchema.anyOf ?? []).some(
      (x) => typeof x !== "boolean" && isSelectorField(x)
    )
  ) {
    return true;
  }

  return false;
}

const devtoolFields: IRenderContext = {
  customRenderers: [
    {
      match: isSelectorField,
      Component: SelectorRenderer,
    },
  ],
  customControls: [
    {
      match: isSelectorField,
      Component: SelectorControl,
    },
  ],
};

export default devtoolFields;
