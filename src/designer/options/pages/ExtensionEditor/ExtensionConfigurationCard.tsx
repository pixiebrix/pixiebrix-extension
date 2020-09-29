import React from "react";
import { SCHEMA_TYPE_TO_BLOCK_PROPERTY } from "@/designer/options/fields/BlockField";
import BlockField from "@/designer/options/fields/BlockField";
import TextField from "@/designer/options/fields/TextField";
import IconField from "@/designer/options/fields/IconField";
import { inputProperties } from "@/helpers";
import { IBlock, IExtensionPoint, Schema } from "@/core";
import { FieldProps } from "@/designer/options/fields/propTypes";
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
  }
  throw new Error(
    `Unsupported field type: ${schema.type ?? "<No type found>"}`
  );
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
