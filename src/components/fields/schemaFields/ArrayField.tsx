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

// Ok to use object here since we don't have any key-specific logic
// eslint-disable-next-line @typescript-eslint/ban-types
import React from "react";
import { SchemaFieldProps } from "@/components/fields/propTypes";
import { FieldArray, useField } from "formik";
import { Schema } from "@/core";
import { Button, Form } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { getDefaultField } from "@/components/fields/blockOptions";
import { booleanPredicate, findOneOf, textPredicate } from "./schemaUtils";

function getDefaultArrayItem(schema: Schema): unknown {
  if (schema.default) {
    return schema.default;
  }

  if (textPredicate(schema)) {
    return "";
  }

  if (schema.type === "object") {
    return {};
  }

  if (findOneOf(schema, booleanPredicate)) {
    return false;
  }

  if (findOneOf(schema, textPredicate)) {
    return "";
  }

  return null;
}

const ArrayField: React.FunctionComponent<SchemaFieldProps<object[]>> = ({
  schema,
  label,
  ...props
}) => {
  const [field] = useField(props);

  if (Array.isArray(schema.items)) {
    throw new TypeError("Support for arrays of mixed types is not implemented");
  } else if (typeof schema.items === "boolean") {
    throw new TypeError("Schema required for items");
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
              {(field.value ?? []).map((item: unknown, index: number) => {
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
                      onClick={() => {
                        remove(index);
                      }}
                    >
                      Remove Item
                    </Button>
                  </li>
                );
              })}
            </ul>
            <Button
              onClick={() => {
                push(getDefaultArrayItem(schemaItems));
              }}
            >
              Add Item
            </Button>
          </>
        )}
      </FieldArray>
    </Form.Group>
  );
};

export default ArrayField;
