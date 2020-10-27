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

import React, { useMemo } from "react";
import Form from "react-bootstrap/Form";
import isEmpty from "lodash/isEmpty";
import Button from "react-bootstrap/Button";
import { FieldProps } from "@/components/fields/propTypes";
import { inputProperties } from "@/helpers";
import { Schema } from "@/core";
import { ObjectField } from "@/components/fields/FieldTable";
import { FieldArray, useField } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";
import identity from "lodash/identity";

const TextField: React.FunctionComponent<FieldProps<string>> = ({
  schema,
  label,
  ...props
}) => {
  const [{ value, ...field }, meta] = useField(props);

  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <Form.Control
        type="text"
        value={value ?? ""}
        {...field}
        isInvalid={!!meta.error}
      />
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

const BooleanField: React.FunctionComponent<FieldProps<boolean>> = ({
  label,
  schema,
  ...props
}) => {
  const [field] = useField(props);

  return (
    <Form.Group>
      <Form.Check
        type="checkbox"
        label={label ?? fieldLabel(field.name)}
        {...field}
      />
      {schema.description && (
        <Form.Text className="text-muted">{schema.description}</Form.Text>
      )}
    </Form.Group>
  );
};

const ArrayField: React.FunctionComponent<FieldProps<object[]>> = ({
  schema,
  label,
  ...props
}) => {
  const [field] = useField(props);

  if (Array.isArray(schema.items)) {
    throw new Error("Support for arrays of mixed types is not implemented");
  } else if (typeof schema.items === "boolean") {
    throw new Error("Schema required for items");
  }
  const schemaItems = schema.items as Schema;

  return (
    <Form.Group controlId={field.name}>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      {schema.description && (
        <Form.Text className="text-muted">{schema.description}</Form.Text>
      )}
      <FieldArray name={field.name}>
        {({ remove, push }) => (
          <>
            <ul className="list-group">
              {field.value.map((item: unknown, index: number) => {
                const Renderer = getDefaultField(schemaItems);
                return (
                  <li className="list-group-item" key={index}>
                    <Renderer
                      key={index}
                      name={`${field.name}.${index}`}
                      schema={schemaItems}
                      label={`${label ?? fieldLabel(field.name)} #${index + 1}`}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      Remove Item
                    </Button>
                  </li>
                );
              })}
            </ul>
            <Button onClick={() => push({})}>Add Item</Button>
          </>
        )}
      </FieldArray>
    </Form.Group>
  );
};

export function getDefaultField(
  fieldSchema: Schema
): React.FunctionComponent<FieldProps<unknown>> {
  switch (fieldSchema.type) {
    case "boolean":
      return BooleanField;
    case "array":
      return ArrayField;
    case "object":
      return ObjectField;
    case "integer":
    case "string":
    default:
      return TextField;
  }
}

const FieldRenderer: React.FunctionComponent<FieldProps<unknown>> = ({
  schema,
  ...props
}) => {
  const Renderer = useMemo(() => getDefaultField(schema), [schema]);
  return <Renderer schema={schema} {...props} />;
};

function genericOptionsFactory(
  schema: Schema
): React.FunctionComponent<{
  name: string;
  configKey?: string;
  showOutputKey?: boolean;
}> {
  return ({ name, configKey, showOutputKey }) => (
    <>
      {Object.entries(inputProperties(schema)).map(([prop, fieldSchema]) => {
        if (typeof fieldSchema === "boolean") {
          throw new Error("Expected schema for input property type");
        }
        return (
          <FieldRenderer
            key={prop}
            name={[name, configKey, prop].filter(identity).join(".")}
            schema={fieldSchema}
          />
        );
      })}
      {showOutputKey && (
        <FieldRenderer
          name={`${name}.outputKey`}
          label="Output Variable"
          schema={{
            type: "string",
            description: "A name to refer to this brick in subsequent bricks",
          }}
        />
      )}
      {isEmpty(schema) && <span>No options available</span>}
    </>
  );
}

export default genericOptionsFactory;
