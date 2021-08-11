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

import { Form, Row, Col } from "react-bootstrap";
import React, { FunctionComponent } from "react";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";
import BootstrapSwitchButton from "bootstrap-switch-button-react";

const BooleanField: FunctionComponent<FieldProps<string>> = ({
  label,
  schema,
  ...props
}) => {
  const [{ value, ...field }, meta, helpers] = useField(props);
  return (
    <Form.Group as={Row} controlId={field.name}>
      <Form.Label column sm="2">
        {label ?? fieldLabel(field.name)}
      </Form.Label>
      <Col sm="10">
        <BootstrapSwitchButton
          size="sm"
          onstyle="info"
          offstyle="light"
          onlabel="On"
          offlabel="Off"
          checked={value ?? false}
          onChange={(value) => {
            helpers.setValue(value);
          }}
        />
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

export default BooleanField;
