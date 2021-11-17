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
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useField } from "formik";
import Select, { OptionsType } from "react-select";
import { sortBy, uniq } from "lodash";
import Creatable from "react-select/creatable";
import { Form, FormControlProps } from "react-bootstrap";

const TextWidget: React.FC<SchemaFieldProps & FormControlProps> = ({
  name,
  schema,
  uiSchema,
  label,
  ...props
}) => {
  const [created, setCreated] = useState([]);
  const [{ value, ...field }, meta, helpers] = useField<string>(name);

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

  if (options.length > 0 && creatable) {
    return (
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
  }

  if (options.length > 0 && !creatable) {
    return (
      <Select
        isClearable
        options={options}
        value={options.find((x) => x.value === value)}
        onChange={(option) => {
          helpers.setValue(option?.value);
        }}
      />
    );
  }

  if (typeof value === "object") {
    console.warn("Cannot edit object as text", { schema, value });
    return <div>Cannot edit object value as text</div>;
  }

  if (schema.format === "markdown" || uiSchema?.["ui:widget"] === "textarea") {
    return (
      <Form.Control
        as="textarea"
        value={value ?? ""}
        {...field}
        {...props}
        isInvalid={Boolean(meta.error)}
      />
    );
  }

  return (
    <Form.Control
      type="text"
      value={value ?? ""}
      {...field}
      {...props}
      isInvalid={Boolean(meta.error)}
    />
  );
};

export default TextWidget;
