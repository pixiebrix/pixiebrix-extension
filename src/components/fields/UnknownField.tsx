/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import { Col, Form, Row } from "react-bootstrap";
import React, { FunctionComponent } from "react";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";

const UnsupportedField: FunctionComponent<FieldProps<unknown>> = ({
  label,
  schema,
  ...props
}) => {
  const [{ ...field }, meta] = useField(props);

  return (
    <Form.Group as={Row} controlId={field.name}>
      <Form.Label column sm="2">
        {label ?? fieldLabel(field.name)}
      </Form.Label>
      <Col sm="10">
        <div>Unsupported field type: {schema.type}</div>
        {schema.description && (
          <Form.Text className="text-muted">{schema.description}</Form.Text>
        )}
        {meta.touched && meta.error && (
          <Form.Control.Feedback type="invalid">
            {meta.error}
          </Form.Control.Feedback>
        )}
      </Col>
    </Form.Group>
  );
};

export default UnsupportedField;
