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

import React, { useContext, useEffect, useMemo } from "react";
import { SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";
import { makeLabelForSchemaField } from "@/components/fields/schemaFields/schemaFieldUtils";
import SchemaFieldContext, {
  CustomFieldToggleMode,
} from "@/components/fields/schemaFields/SchemaFieldContext";
import { useField } from "formik";
import { isEmpty, sortBy } from "lodash";
import FieldTemplate from "@/components/form/FieldTemplate";
import UnsupportedWidget from "@/components/fields/schemaFields/widgets/UnsupportedWidget";
import TemplateToggleWidget, {
  InputModeOption,
  StringOption,
} from "@/components/fields/schemaFields/widgets/TemplateToggleWidget";
import TextWidget from "@/components/fields/schemaFields/widgets/TextWidget";
import { Schema } from "@/core";
import ComplexObjectWidget from "@/components/fields/schemaFields/widgets/ComplexObjectWidget";
import ArrayWidget from "@/components/fields/schemaFields/widgets/ArrayWidget";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faToggleOff } from "@fortawesome/free-solid-svg-icons";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import IntegerWidget from "@/components/fields/schemaFields/widgets/IntegerWidget";
import NumberWidget from "@/components/fields/schemaFields/widgets/NumberWidget";
import OmitFieldWidget from "@/components/fields/schemaFields/widgets/OmitFieldWidget";

const varOption: StringOption = {
  label: "Variable",
  value: "var",
  symbol: "⟮𝑥⟯",
  Widget: TextWidget,
  defaultValue: {
    __type__: "var",
    __value__: "",
  },
};

type ToggleOptionInputs = {
  fieldSchema: Schema;
  isRequired: boolean;
  customToggleModes: CustomFieldToggleMode[];
  isObjectProperty: boolean;
  isArrayItem: boolean;
};

function getToggleOptions({
  fieldSchema,
  isRequired,
  customToggleModes,
  isObjectProperty,
  isArrayItem,
}: ToggleOptionInputs): InputModeOption[] {
  const options: InputModeOption[] = [];

  function pushOptions(...opts: InputModeOption[]) {
    for (const opt of opts) {
      if (!options.some((x) => x.value === opt.value)) {
        options.push(opt);
      }
    }
  }

  for (const mode of customToggleModes) {
    // eslint-disable-next-line unicorn/prefer-regexp-test -- ?? not using String.match()
    if (mode.match(fieldSchema)) {
      pushOptions(mode.option);
    }
  }

  const anyType = !Object.prototype.hasOwnProperty.call(fieldSchema, "type");

  if (Array.isArray(fieldSchema.type)) {
    const { type: typeArray, ...rest } = fieldSchema;
    return typeArray.flatMap((type) =>
      getToggleOptions({
        fieldSchema: { type, ...rest },
        isRequired,
        customToggleModes,
        isObjectProperty,
        isArrayItem,
      })
    );
  }

  if (fieldSchema.type === "array" || anyType) {
    // Don't allow editing array fields nested inside objects/arrays
    const Widget =
      isObjectProperty || isArrayItem ? ComplexObjectWidget : ArrayWidget;
    pushOptions(
      {
        label: "Array items",
        value: "array",
        symbol: "[...]",
        Widget,
        defaultValue: Array.isArray(fieldSchema.default)
          ? fieldSchema.default
          : [],
      },
      varOption
    );
  }

  if (
    fieldSchema.type === "object" ||
    anyType ||
    // An empty field schema supports any value. For now, provide an object field since this just shows up
    // in the @pixiebrix/http brick.
    // https://github.com/pixiebrix/pixiebrix-extension/issues/709
    isEmpty(fieldSchema)
  ) {
    // Don't allow editing objects inside other objects
    const Widget = isObjectProperty ? ComplexObjectWidget : ObjectWidget;
    pushOptions(
      {
        label: "Object properties",
        value: "object",
        symbol: "{...}",
        Widget,
        defaultValue: (typeof fieldSchema.default === "object"
          ? fieldSchema.default
          : {}) as Record<string, unknown>,
      },
      varOption
    );
  }

  if (fieldSchema.type === "boolean" || anyType) {
    pushOptions(
      {
        label: "Toggle",
        value: "boolean",
        symbol: <FontAwesomeIcon icon={faToggleOff} />,
        Widget: SwitchButtonWidget,
        defaultValue:
          typeof fieldSchema.default === "boolean"
            ? fieldSchema.default
            : false,
      },
      varOption
    );
  }

  if (fieldSchema.type === "string" || anyType) {
    if (
      fieldSchema.enum &&
      Array.isArray(fieldSchema.enum) &&
      fieldSchema.enum.length > 0
    ) {
      pushOptions({
        label: "Select...",
        value: "string",
        symbol: "a|b|c",
        Widget: TextWidget,
        defaultValue:
          typeof fieldSchema.default === "string"
            ? String(fieldSchema.default)
            : "",
      });
    } else {
      pushOptions({
        label: "Plain text",
        value: "string",
        symbol: "Abc",
        Widget: TextWidget,
        defaultValue:
          typeof fieldSchema.default === "string"
            ? String(fieldSchema.default)
            : "",
      });
    }

    pushOptions(
      varOption,
      {
        label: "Mustache template",
        value: "mustache",
        symbol: "{{  }}",
        Widget: TextWidget,
        defaultValue: {
          __type__: "mustache",
          __value__: "",
        },
      },
      {
        label: "Nunjucks template",
        value: "nunjucks",
        symbol: "{%%}",
        Widget: TextWidget,
        defaultValue: {
          __type__: "nunjucks",
          __value__: "",
        },
      }
    );
  }

  // Don't include integer for "anyType", only include number, which can also accept integers
  if (fieldSchema.type === "integer") {
    pushOptions(
      {
        label: "Whole number",
        value: "number",
        symbol: "123",
        Widget: IntegerWidget,
        defaultValue:
          typeof fieldSchema.default === "number" ? fieldSchema.default : 0,
      },
      varOption
    );
  }

  if (fieldSchema.type === "number" || anyType) {
    pushOptions(
      {
        label: "Number",
        value: "number",
        symbol: "1.23",
        Widget: NumberWidget,
        defaultValue:
          typeof fieldSchema.default === "number" ? fieldSchema.default : 0,
      },
      varOption
    );
  }

  const multiSchemas = [
    ...(fieldSchema.anyOf ?? []),
    ...(fieldSchema.oneOf ?? []),
  ];
  const multiOptions = multiSchemas.flatMap((subSchema) => {
    if (typeof subSchema === "boolean") {
      return [];
    }

    return getToggleOptions({
      fieldSchema: subSchema,
      isRequired,
      customToggleModes,
      isObjectProperty,
      isArrayItem,
    });
  });
  pushOptions(...multiOptions);

  if (!isRequired) {
    if (isArrayItem) {
      pushOptions({
        label: "Remove",
        value: "omit",
        symbol: "❌",
        Widget: OmitFieldWidget,
      });
    } else {
      pushOptions({
        label: "Exclude",
        value: "omit",
        symbol: "∅",
        Widget: OmitFieldWidget,
      });
    }
  }

  return sortBy(options, (opt: InputModeOption) => opt.value === "omit");
}

const BasicSchemaField: SchemaFieldComponent = (props) => {
  const {
    name,
    schema,
    isRequired,
    description,
    isObjectProperty = false,
    isArrayItem = false,
  } = props;
  const fieldLabel = makeLabelForSchemaField(props);
  const fieldDescription = description ?? schema.description;

  const { customToggleModes } = useContext(SchemaFieldContext);

  const isObjectType =
    schema.type === "object" ||
    !Object.prototype.hasOwnProperty.call(schema, "type");
  if (
    isObjectType &&
    schema.properties === undefined &&
    schema.additionalProperties === undefined
  ) {
    schema.additionalProperties = true;
  }

  const inputModeOptions = useMemo(
    () =>
      getToggleOptions({
        fieldSchema: schema,
        isRequired,
        customToggleModes,
        isObjectProperty,
        isArrayItem,
      }),
    [customToggleModes, isArrayItem, isObjectProperty, isRequired, schema]
  );

  const [{ value }, , { setValue }] = useField(name);

  useEffect(() => {
    // Initialize any undefined/empty required fields to prevent inferring an "omit" input
    if (!value && isRequired && !isEmpty(inputModeOptions)) {
      setValue(inputModeOptions[0].defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  }, []);

  if (isEmpty(inputModeOptions)) {
    return (
      <FieldTemplate
        name={name}
        label={fieldLabel}
        description={fieldDescription}
        as={UnsupportedWidget}
      />
    );
  }

  return (
    <FieldTemplate
      name={name}
      label={fieldLabel}
      description={fieldDescription}
      as={TemplateToggleWidget}
      inputModeOptions={inputModeOptions}
      {...props}
    />
  );
};

export default BasicSchemaField;
