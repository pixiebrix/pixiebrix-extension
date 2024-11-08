import React from "react";
import { type BrickOptionProps } from "../../components/fields/schemaFields/genericOptionsFactory";
import { type Schema } from "../../types/schemaTypes";
import SchemaField from "../../components/fields/schemaFields/SchemaField";
import { joinName } from "../../utils/formUtils";

const ANY_SCHEMA: Schema = {
  title: "Value",
  description: "The value to return",
};

/**
 * Page Editor fields for the @pixiebrix/identity brick.
 */
const IdentityTransformerOptions: React.FunctionComponent<BrickOptionProps> = ({
  name,
  configKey = null,
}) => (
  <SchemaField
    label="Value"
    name={joinName(name, configKey)}
    schema={ANY_SCHEMA}
    // Mark as required so the widget defaults to showing the number entry
    isRequired
  />
);

export default IdentityTransformerOptions;
