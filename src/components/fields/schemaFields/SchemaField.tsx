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

import React, { useCallback, useContext, useEffect, useMemo } from "react";
import SchemaFieldContext, {
  CustomFieldToggleMode,
  getDefaultField,
} from "@/components/fields/schemaFields/SchemaFieldContext";
import { Schema } from "@/core";
import { SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";
import TemplateToggleWidget, {
  InputModeOption,
  StringOption,
} from "@/components/fields/schemaFields/widgets/TemplateToggleWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { makeLabelForSchemaField } from "@/components/fields/schemaFields/schemaFieldUtils";
import OmitFieldWidget from "@/components/fields/schemaFields/widgets/OmitFieldWidget";
import IntegerWidget from "@/components/fields/schemaFields/widgets/IntegerWidget";
import NumberWidget from "@/components/fields/schemaFields/widgets/NumberWidget";
import ServiceField, {
  isServiceField,
} from "@/components/fields/schemaFields/ServiceField";
import ArrayWidget from "@/components/fields/schemaFields/widgets/ArrayWidget";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";
import { isEmpty } from "lodash";
import TextWidget from "@/components/fields/schemaFields/widgets/TextWidget";
import { useField } from "formik";
import UnsupportedWidget from "@/components/fields/schemaFields/widgets/UnsupportedWidget";
import { useApiVersionAtLeast } from "@/components/fields/fieldUtils";
import ComplexObjectWidget from "@/components/fields/schemaFields/widgets/ComplexObjectWidget";

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

function getToggleOptions(
  fieldSchema: Schema,
  isRequired: boolean,
  customModes: CustomFieldToggleMode[],
  isObjectProperty: boolean,
  isArrayItem: boolean
): InputModeOption[] {
  const options: InputModeOption[] = [];

  function pushOpts(...opts: InputModeOption[]) {
    for (const opt of opts) {
      if (!options.some((x) => x.value === opt.value)) {
        options.push(opt);
      }
    }
  }

  for (const mode of customModes) {
    // eslint-disable-next-line unicorn/prefer-regexp-test -- ?? not using String.match()
    if (mode.match(fieldSchema)) {
      pushOpts(mode.option);
    }
  }

  if (Array.isArray(fieldSchema.type)) {
    const { type, ...rest } = fieldSchema;
    return type.flatMap((type) =>
      getToggleOptions(
        { type, ...rest },
        isRequired,
        customModes,
        isObjectProperty,
        isArrayItem
      )
    );
  }

  if (fieldSchema.type === "array") {
    // Don't allow editing array fields nested inside objects/arrays
    const Widget =
      isObjectProperty || isArrayItem ? ComplexObjectWidget : ArrayWidget;
    pushOpts(
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
    // An empty field schema supports any value. For now, provide an object field since this just shows up
    // in the @pixiebrix/http brick.
    // https://github.com/pixiebrix/pixiebrix-extension/issues/709
    isEmpty(fieldSchema)
  ) {
    // Don't allow editing objects inside other objects
    const Widget = isObjectProperty ? ComplexObjectWidget : ObjectWidget;
    pushOpts(
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

  if (fieldSchema.type === "boolean") {
    pushOpts(
      {
        label: "Toggle",
        value: "boolean",
        symbol: "<->",
        Widget: SwitchButtonWidget,
        defaultValue:
          typeof fieldSchema.default === "boolean"
            ? fieldSchema.default
            : false,
      },
      varOption
    );
  }

  if (fieldSchema.type === "string") {
    if (
      fieldSchema.enum &&
      Array.isArray(fieldSchema.enum) &&
      fieldSchema.enum.length > 0
    ) {
      pushOpts({
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
      pushOpts({
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

    pushOpts(
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
      },
      {
        label: "Handlebars template",
        value: "handlebars",
        symbol: "{{ # }}",
        Widget: TextWidget,
        defaultValue: {
          __type__: "handlebars",
          __value__: "",
        },
      }
    );
  }

  if (fieldSchema.type === "integer") {
    pushOpts(
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

  if (fieldSchema.type === "number") {
    pushOpts(
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

  if (fieldSchema.anyOf?.length > 0) {
    const anyOfOptions = fieldSchema.anyOf.flatMap((subSchema) => {
      if (typeof subSchema === "boolean") {
        return [];
      }

      return getToggleOptions(
        subSchema,
        isRequired,
        customModes,
        isObjectProperty,
        isArrayItem
      );
    });
    pushOpts(...anyOfOptions);
  }

  if (fieldSchema.oneOf?.length > 0) {
    const oneOfOptions = fieldSchema.oneOf.flatMap((subSchema) => {
      if (typeof subSchema === "boolean") {
        return [];
      }

      return getToggleOptions(
        subSchema,
        isRequired,
        customModes,
        isObjectProperty,
        isArrayItem
      );
    });
    pushOpts(...oneOfOptions);
  }

  if (!isRequired) {
    if (isArrayItem) {
      pushOpts({
        label: "Remove",
        value: "omit",
        symbol: "❌",
        Widget: OmitFieldWidget,
      });
    } else {
      pushOpts({
        label: "Exclude",
        value: "omit",
        symbol: "∅",
        Widget: OmitFieldWidget,
      });
    }
  }

  return options;
}

/**
 * A schema-based field that automatically determines it's layout/widget based on the schema and uiSchema.
 *
 * @see SchemaFieldContext
 * @see getDefaultField
 */
const SchemaField: SchemaFieldComponent = (props) => {
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

  const { customFields, customToggleModes } = useContext(SchemaFieldContext);

  const LegacyField = useMemo(() => {
    const overrideField = customFields.find((x) => x.match(schema))?.Component;
    return overrideField ?? getDefaultField(schema);
  }, [customFields, schema]);

  const inputModeOptions = useMemo(
    () =>
      getToggleOptions(
        schema,
        isRequired,
        customToggleModes,
        isObjectProperty,
        isArrayItem
      ),
    [customToggleModes, isArrayItem, isObjectProperty, isRequired, schema]
  );

  const [{ value }, , { setValue }] = useField(name);
  const stableSetValue = useCallback(
    (value: unknown) => {
      setValue(value);
    },
    // See formik issue: https://github.com/formium/formik/issues/2268
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const useLegacyFields = !useApiVersionAtLeast("v3");

  const isService = isServiceField(schema);

  useEffect(() => {
    // Initialize any undefined/empty required fields to prevent inferring an "omit" input
    if (
      !value &&
      isRequired &&
      !isService &&
      !useLegacyFields &&
      !isEmpty(inputModeOptions)
    ) {
      stableSetValue(inputModeOptions[0].defaultValue);
    }
  }, [
    inputModeOptions,
    isRequired,
    isService,
    stableSetValue,
    useLegacyFields,
    value,
  ]);

  if (useLegacyFields) {
    return <LegacyField {...props} />;
  }

  if (isService) {
    return <ServiceField {...props} />;
  }

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

export default SchemaField;
