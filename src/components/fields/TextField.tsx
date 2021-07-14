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
import React, { FunctionComponent, useMemo, useState } from "react";
import { uniq } from "lodash";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";
import Creatable from "react-select/creatable";
import Select, { OptionsType } from "react-select";

const TextField: FunctionComponent<FieldProps<string>> = ({
  label,
  schema,
  ...props
}) => {
  const [created, setCreated] = useState([]);
  const [{ value, ...field }, meta, helpers] = useField(props);

  const [creatable, options]: [
    boolean,
    OptionsType<{ value: string }>
  ] = useMemo(() => {
    const values = schema?.examples ?? schema?.enum;
    const options = Array.isArray(values)
      ? uniq([...created, ...values]).map((x) => ({ value: x, label: x }))
      : [];
    return [schema?.enum == null, options];
  }, [created, schema?.examples, schema?.enum]);

  let control;

  if (options.length > 0 && creatable) {
    control = (
      <Creatable
        isClearable
        options={options}
        onCreateOption={(value) => setCreated(uniq([...created, value]))}
        value={options.find((x) => x.value === value)}
        onChange={(option) => helpers.setValue(option?.value)}
      />
    );
  } else if (options.length > 0 && !creatable) {
    control = (
      <Select
        isClearable
        options={options}
        value={options.find((x) => x.value === value)}
        onChange={(option) => helpers.setValue(option?.value)}
      />
    );
  } else if (schema.format === "markdown") {
    control = (
      <Form.Control
        as="textarea"
        value={value ?? ""}
        {...field}
        isInvalid={!!meta.error}
      />
    );
  } else {
    control = (
      <Form.Control
        type="text"
        value={value ?? ""}
        {...field}
        isInvalid={!!meta.error}
      />
    );
  }

  return (
    <Form.Group as={Row} controlId={field.name}>
      <Form.Label column sm="2">
        {label ?? fieldLabel(field.name)}
      </Form.Label>
      <Col sm="10">
        {control}
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

export default TextField;
