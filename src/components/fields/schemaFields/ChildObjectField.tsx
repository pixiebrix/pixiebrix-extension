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
import { SchemaFieldProps } from "@/components/fields/propTypes";
import { Card, Form } from "react-bootstrap";
import { inputProperties } from "@/helpers";
import { FieldRenderer } from "@/components/fields/blockOptions";

const ChildObjectField: React.FunctionComponent<
  SchemaFieldProps<Record<string, unknown>> & { heading: string }
> = ({ name, heading, schema, label }) => (
  <Form.Group>
    <Form.Label>{label}</Form.Label>
    <Card>
      <Card.Header>{heading}</Card.Header>
      <Card.Body>
        {schema &&
          Object.entries(inputProperties(schema)).map(([prop, fieldSchema]) => {
            if (typeof fieldSchema === "boolean") {
              throw new TypeError("Expected schema for input property type");
            }

            return (
              <FieldRenderer
                key={prop}
                name={`${name}.${prop}`}
                schema={schema}
              />
            );
          })}
      </Card.Body>
    </Card>
  </Form.Group>
);

export default ChildObjectField;
