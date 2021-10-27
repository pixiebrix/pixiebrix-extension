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

import React, { useContext, useMemo } from "react";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import { Schema } from "@/core";
import { SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";
import TemplateToggleWidget, {
  InputModeOption,
  StringOption,
} from "@/components/fields/schemaFields/widgets/TemplateToggleWidget";
import FieldTemplate, { FieldProps } from "@/components/form/FieldTemplate";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { makeFieldLabel } from "@/components/fields/schemaFields/schemaFieldUtils";
import OmitFieldWidget from "@/components/fields/schemaFields/widgets/OmitFieldWidget";
import { Form } from "react-bootstrap";
import IntegerWidget from "@/components/fields/schemaFields/widgets/IntegerWidget";
import NumberWidget from "@/components/fields/schemaFields/widgets/NumberWidget";

const varOption: StringOption = {
  label: "Connect @ data",
  value: "var",
  Widget: Form.Control,
  defaultValue: "",
};

function getToggleOptionsForSchema(
  name: string,
  schema: Schema
): InputModeOption[] {
  const opts: InputModeOption[] = [];

  const splits = name.split(".");
  const fieldName = splits[splits.length - 1];

  // Need to handle multi-schema: schema.anyOf | schema.oneOf | Array.isArray(schema.type)

  if (schema.type === "boolean") {
    opts.push(
      {
        label: "True/False",
        value: "boolean",
        Widget: SwitchButtonWidget,
        defaultValue:
          typeof schema.default === "boolean" ? schema.default : false,
      },
      varOption
    );
  }

  if (schema.type === "string") {
    opts.push(
      {
        label: "Plain text",
        value: "string",
        Widget: Form.Control,
        defaultValue:
          typeof schema.default === "string" ? String(schema.default) : "",
      },
      varOption,
      {
        label: "Mustache template",
        value: "mustache",
        Widget: Form.Control,
        defaultValue: "",
      },
      {
        label: "Nunjucks template",
        value: "nunjucks",
        Widget: Form.Control,
        defaultValue: "",
      },
      {
        label: "Handlebars template",
        value: "handlebars",
        Widget: Form.Control,
        defaultValue: "",
      }
    );
  }

  if (schema.type === "integer") {
    opts.push(
      {
        label: "Enter a whole number",
        value: "number",
        Widget: IntegerWidget,
        defaultValue: typeof schema.default === "number" ? schema.default : 0,
      },
      varOption
    );
  }

  if (schema.type === "number") {
    opts.push(
      {
        label: "Enter a number",
        value: "number",
        Widget: NumberWidget,
        defaultValue: typeof schema.default === "number" ? schema.default : 0,
      },
      varOption
    );
  }

  // Handle Array and Object

  if (!schema.required?.includes(fieldName)) {
    opts.push({
      label: "Omit",
      value: "omit",
      Widget: OmitFieldWidget,
      defaultValue: null,
    });
  }

  return opts;
}

/**
 * A schema-based field that automatically determines it's layout/widget based on the schema and uiSchema.
 *
 * @see SchemaFieldContext
 * @see getDefaultField
 */
const SchemaField: SchemaFieldComponent = ({
  name,
  schema,
  label,
  description,
}) => {
  const { customWidgets } = useContext(SchemaFieldContext);
  const overrideWidget = useMemo(
    () => customWidgets.find((x) => x.match(schema))?.Component,
    [schema, customWidgets]
  );

  const props: FieldProps = {
    name,
    label: makeFieldLabel(name, schema, label),
    description: description ?? schema.description,
    as: TemplateToggleWidget,
    inputModeOptions: getToggleOptionsForSchema(name, schema),
    overrideWidget,
  };
  if (schema.default) {
    props.defaultValue = schema.default;
  }

  return <FieldTemplate {...props} />;
};

export default SchemaField;
