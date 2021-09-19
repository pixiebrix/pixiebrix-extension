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

import { CustomFieldWidget } from "@/components/form/FieldTemplate";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { FieldArray, useField } from "formik";
import { getDefaultField } from "@/components/fields/schemaFields/SchemaFieldContext";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { Button } from "react-bootstrap";
import React from "react";
import { Schema } from "@/core";
import {
  booleanPredicate,
  findOneOf,
  textPredicate,
} from "@/components/fields/schemaFields/schemaUtils";

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

const ArrayWidget: CustomFieldWidget<SchemaFieldProps<unknown>> = ({
  schema,
  label,
  name,
}) => {
  const [field] = useField<Array<Record<string, unknown>>>(name);

  if (Array.isArray(schema.items)) {
    throw new TypeError("Support for arrays of mixed types is not implemented");
  } else if (typeof schema.items === "boolean") {
    throw new TypeError("Schema required for items");
  }

  const schemaItems = schema.items as Schema;

  return (
    <FieldArray name={name}>
      {({ remove, push }) => (
        <>
          <ul className="list-group">
            {(field.value ?? []).map((item: unknown, index: number) => {
              const Renderer = getDefaultField(schemaItems);
              return (
                <li className="list-group-item" key={index}>
                  <Renderer
                    key={index}
                    name={[name, String(index)].join(".")}
                    schema={schemaItems}
                    label={`${label ?? fieldLabel(name)} #${index + 1}`}
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
  );
};

export default ArrayWidget;
