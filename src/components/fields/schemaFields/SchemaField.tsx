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
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import { Schema } from "@/core";
import { SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";
import TemplateToggleWidget, {
  InputModeOption,
  StringOption,
} from "@/components/fields/schemaFields/widgets/TemplateToggleWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { makeFieldLabel } from "@/components/fields/schemaFields/schemaFieldUtils";
import OmitFieldWidget from "@/components/fields/schemaFields/widgets/OmitFieldWidget";
import IntegerWidget from "@/components/fields/schemaFields/widgets/IntegerWidget";
import NumberWidget from "@/components/fields/schemaFields/widgets/NumberWidget";
import ServiceField, {
  isServiceField,
} from "@/components/fields/schemaFields/ServiceField";
import ArrayWidget from "@/components/fields/schemaFields/widgets/ArrayWidget";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";
import { isEmpty, uniqBy } from "lodash";
import TextWidget from "@/components/fields/schemaFields/widgets/TextWidget";
import { useField } from "formik";
import UnsupportedWidget from "@/components/fields/schemaFields/widgets/UnsupportedWidget";

const varOption: StringOption = {
  label: "@{data}",
  value: "var",
  Widget: TextWidget,
  defaultValue: {
    __type__: "var",
    __value__: "",
  },
};

function getToggleOptions(
  fieldSchema: Schema,
  isRequired = false
): InputModeOption[] {
  const opts: InputModeOption[] = [];

  if (Array.isArray(fieldSchema.type)) {
    const { type, ...rest } = fieldSchema;
    return type.flatMap((type) => getToggleOptions({ type, ...rest }));
  }

  if (fieldSchema.type === "array") {
    opts.push(
      {
        label: "Items",
        value: "array",
        Widget: ArrayWidget,
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
    opts.push(
      {
        label: "Properties",
        value: "object",
        Widget: ObjectWidget,
        defaultValue: (typeof fieldSchema.default === "object"
          ? fieldSchema.default
          : {}) as Record<string, unknown>,
      },
      varOption
    );
  }

  if (fieldSchema.type === "boolean") {
    opts.push(
      {
        label: "True/False",
        value: "boolean",
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
    opts.push(
      {
        label: "Text",
        value: "string",
        Widget: TextWidget,
        defaultValue:
          typeof fieldSchema.default === "string"
            ? String(fieldSchema.default)
            : "",
      },
      varOption,
      {
        label: "Mustache",
        value: "mustache",
        Widget: TextWidget,
        defaultValue: {
          __type__: "mustache",
          __value__: "",
        },
      },
      {
        label: "Nunjucks",
        value: "nunjucks",
        Widget: TextWidget,
        defaultValue: {
          __type__: "nunjucks",
          __value__: "",
        },
      },
      {
        label: "Handlebars",
        value: "handlebars",
        Widget: TextWidget,
        defaultValue: {
          __type__: "handlebars",
          __value__: "",
        },
      }
    );
  }

  if (fieldSchema.type === "integer") {
    opts.push(
      {
        label: "Integer",
        value: "number",
        Widget: IntegerWidget,
        defaultValue:
          typeof fieldSchema.default === "number" ? fieldSchema.default : 0,
      },
      varOption
    );
  }

  if (fieldSchema.type === "number") {
    opts.push(
      {
        label: "Number",
        value: "number",
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

      return getToggleOptions(subSchema);
    });
    opts.push(...anyOfOptions);
  }

  if (fieldSchema.oneOf?.length > 0) {
    const oneOfOptions = fieldSchema.oneOf.flatMap((subSchema) => {
      if (typeof subSchema === "boolean") {
        return [];
      }

      return getToggleOptions(subSchema);
    });
    opts.push(...oneOfOptions);
  }

  if (!isRequired) {
    opts.push({
      label: "Omit",
      value: "omit",
      Widget: OmitFieldWidget,
    });
  }

  return uniqBy(opts, (x) => x.value);
}

/**
 * A schema-based field that automatically determines it's layout/widget based on the schema and uiSchema.
 *
 * @see SchemaFieldContext
 * @see getDefaultField
 */
const SchemaField: SchemaFieldComponent = (props) => {
  const { name, schema, isRequired, label, description } = props;

  const { customWidgets } = useContext(SchemaFieldContext);
  const overrideWidget = useMemo(
    () => customWidgets.find((x) => x.match(schema))?.Component,
    [schema, customWidgets]
  );
  const inputModeOptions = useMemo(() => getToggleOptions(schema, isRequired), [
    isRequired,
    schema,
  ]);
  const [{ value }, , { setValue }] = useField(name);
  const stableSetValue = useCallback(
    (value: unknown) => {
      setValue(value);
    },
    // See formik issue: https://github.com/formium/formik/issues/2268
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    // Initialize any undefined/empty required fields to prevent inferring an "omit" input
    if (!value && isRequired) {
      stableSetValue(inputModeOptions[0].defaultValue);
    }
  }, [inputModeOptions, isRequired, stableSetValue, value]);

  if (isServiceField(schema)) {
    return <ServiceField {...props} />;
  }

  const fieldLabel = makeFieldLabel(name, schema, label);
  const fieldDescription = description ?? schema.description;

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
      overrideWidget={overrideWidget}
      {...props}
    />
  );
};

export default SchemaField;
