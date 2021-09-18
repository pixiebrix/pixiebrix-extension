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

import React, { useMemo, useState } from "react";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import Select, { OptionsType } from "react-select";
import { sortBy, uniq } from "lodash";
import Creatable from "react-select/creatable";
import { Form } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";

const TextField: React.FunctionComponent<FieldProps<string>> = ({
  schema,
  uiSchema,
  label,
  ...props
}) => {
  const [created, setCreated] = useState([]);
  const [{ value, ...field }, meta, helpers] = useField(props);

  const [creatable, options]: [
    boolean,
    OptionsType<{ value: string }>
  ] = useMemo(() => {
    const values = schema.examples ?? schema.enum;
    const options =
      schema.type === "string" && Array.isArray(values)
        ? sortBy(
            uniq([...created, ...values, value].filter((x) => x != null))
          ).map((value) => ({
            value,
            label: value,
          }))
        : [];
    return [schema?.enum == null, options];
  }, [schema.examples, schema.enum, created, value, schema.type]);

  let control;

  if (options.length > 0 && creatable) {
    control = (
      <Creatable
        isClearable
        options={options}
        onCreateOption={(value) => {
          helpers.setValue(value);
          setCreated(uniq([...created, value]));
        }}
        value={options.find((x) => x.value === value)}
        onChange={(option) => {
          helpers.setValue(option?.value);
        }}
      />
    );
  } else if (options.length > 0 && !creatable) {
    control = (
      <Select
        isClearable
        options={options}
        value={options.find((x) => x.value === value)}
        onChange={(option) => {
          helpers.setValue(option?.value);
        }}
      />
    );
  } else if (typeof value === "object") {
    console.warn("Cannot edit object as text", { schema, value });
    control = <div>Cannot edit object value as text</div>;
  } else if (
    schema.format === "markdown" ||
    uiSchema?.["ui:widget"] === "textarea"
  ) {
    control = (
      <Form.Control
        as="textarea"
        value={value ?? ""}
        {...field}
        isInvalid={Boolean(meta.error)}
      />
    );
  } else {
    control = (
      <Form.Control
        type="text"
        value={value ?? ""}
        {...field}
        isInvalid={Boolean(meta.error)}
      />
    );
  }

  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      {control}
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

export default TextField;
