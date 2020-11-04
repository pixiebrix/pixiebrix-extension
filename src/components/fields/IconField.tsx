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

import React, { useCallback, Suspense } from "react";
import { FieldProps } from "@/components/fields/propTypes";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { IconOption } from "@/icons/types";
import { useField } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { IconConfig } from "@/core";

const IconSelector = React.lazy(
  () =>
    import(
      /* webpackChunkName: "icons" */
      "@/icons/IconSelector"
    )
);

const IconField: React.FunctionComponent<FieldProps<IconConfig>> = ({
  label,
  ...props
}) => {
  const [field, meta, helpers] = useField(props);

  const setFieldProps = useCallback(
    ({ value }: IconOption) => {
      helpers.setValue({
        id: value.id,
        library: value.library,
        size: meta.value?.size ?? 16,
      });
      helpers.setTouched(true);
      helpers.setError(undefined);
    },
    [helpers]
  );

  return (
    <Form.Group as={Row} controlId={field.name}>
      <Form.Label column sm="2">
        {label ?? fieldLabel(field.name)}
      </Form.Label>
      <Col sm="10">
        <Suspense fallback={<div>Loading...</div>}>
          <IconSelector value={meta.value} onChange={setFieldProps} />
          {meta.touched && meta.error && (
            <Form.Control.Feedback type="invalid">
              {meta.error}
            </Form.Control.Feedback>
          )}
        </Suspense>
      </Col>
    </Form.Group>
  );
};

export default IconField;
