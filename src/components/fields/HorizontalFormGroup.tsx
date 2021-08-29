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
import { Col, Form, Row } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { useField } from "formik";
import { FieldInputProps, FieldMetaProps } from "formik/dist/types";
import { FieldHookConfig } from "formik/dist/Field";

type OwnProps<T = any> = {
  description?: string;
  label?: string;
  propsOrFieldName: string | FieldHookConfig<T>;
  children: (
    field: FieldInputProps<T>,
    meta: FieldMetaProps<T>
  ) => React.ReactElement;
};

function HorizontalFormGroup<T = any>({
  label,
  propsOrFieldName,
  description,
  children,
}: OwnProps<T>): React.ReactElement {
  const [field, meta] = useField<T>(propsOrFieldName);

  return (
    <Form.Group as={Row} controlId={field.name}>
      <Form.Label column sm="2">
        {label ?? fieldLabel(field.name)}
      </Form.Label>
      <Col sm="10">
        {children(field, meta)}
        {description && (
          <Form.Text className="text-muted">{description}</Form.Text>
        )}
        {meta.touched && meta.error && (
          <Form.Control.Feedback type="invalid">
            {meta.error}
          </Form.Control.Feedback>
        )}
      </Col>
    </Form.Group>
  );
}

export default HorizontalFormGroup;
