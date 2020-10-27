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

import React from "react";
import { SCHEMA_TYPE_TO_BLOCK_PROPERTY } from "@/components/fields/BlockField";
import BlockField from "@/components/fields/BlockField";
import TextField from "@/components/fields/TextField";
import IconField from "@/components/fields/IconField";
import { inputProperties } from "@/helpers";
import { IBlock, IExtensionPoint, Schema } from "@/core";
import { FieldProps } from "@/components/fields/propTypes";
import Card from "react-bootstrap/Card";

function defaultFieldRenderer(
  schema: Schema
): React.FunctionComponent<FieldProps<unknown>> {
  if (schema.type === "string" || schema.type === "boolean") {
    return TextField;
  } else if (SCHEMA_TYPE_TO_BLOCK_PROPERTY[schema["$ref"]]) {
    return BlockField;
  } else if (schema["$ref"] === "https://app.pixiebrix.com/schemas/icon#") {
    return IconField;
  } else if (
    (schema["oneOf"] ?? []).some(
      (x) => SCHEMA_TYPE_TO_BLOCK_PROPERTY[(x as any)["$ref"]]
    )
  ) {
    return BlockField;
  } else if (schema["$ref"] && !schema.type) {
    throw new Error(`Unexpected $ref ${schema["$ref"]}`);
  } else {
    const msg = `Unsupported field type: ${schema.type ?? "<No type found>"}`;
    console.error(msg, schema);
    throw new Error(msg);
  }
}

interface OwnProps {
  extensionPoint: IExtensionPoint;
  blocks: IBlock[];
  name?: string;
}

const ExtensionConfigurationCard: React.FunctionComponent<OwnProps> = ({
  name,
  extensionPoint,
  blocks = [],
}) => {
  return (
    <Card.Body>
      {Object.entries(inputProperties(extensionPoint.inputSchema)).map(
        ([property, schema]) => {
          const Field = defaultFieldRenderer(schema as Schema);
          return (
            <Field
              key={property}
              name={name ? `${name}.${property}` : property}
              schema={schema as Schema}
              // @ts-ignore: need to type field props to allow extra types
              blocks={blocks}
            />
          );
        }
      )}
    </Card.Body>
  );
};

export default ExtensionConfigurationCard;
