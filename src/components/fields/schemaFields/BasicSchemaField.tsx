/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  getOptionForInputMode,
  InputModeOption,
  OmitOption,
  StringOption,
} from "@/components/fields/schemaFields/widgets/TemplateToggleWidget";
import TextWidget from "@/components/fields/schemaFields/widgets/TextWidget";
import { ExpressionType, Schema } from "@/core";
import ComplexObjectWidget from "@/components/fields/schemaFields/widgets/ComplexObjectWidget";
import ArrayWidget from "@/components/fields/schemaFields/widgets/ArrayWidget";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";
import IntegerWidget from "@/components/fields/schemaFields/widgets/IntegerWidget";
import NumberWidget from "@/components/fields/schemaFields/widgets/NumberWidget";
import OmitFieldWidget from "@/components/fields/schemaFields/widgets/OmitFieldWidget";
import cx from "classnames";
import SchemaSelectWidget, {
  isSelectField,
} from "@/components/fields/schemaFields/widgets/SchemaSelectWidget";
import { isTemplateExpression } from "@/runtime/mapArgs";
import { UnknownObject } from "@/types";
import OptionIcon from "@/components/fields/schemaFields/optionIcon/OptionIcon";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";

const varOption: StringOption = {
  label: "Variable",
  value: "var",
  symbol: <OptionIcon icon="variable" />,
  Widget: TextWidget,
  interpretValue: (oldValue: unknown) => {
    let newValue = "";
    if (typeof oldValue === "string") {
      newValue = oldValue;
    } else if (typeof oldValue === "number" && oldValue > 0) {
      newValue = String(oldValue);
    } else if (isTemplateExpression(oldValue)) {
      newValue = oldValue.__value__;
    }

    return {
      // Cast as ExpressionType because without it there's a type error compiling in the app project. (Because
      // Typescript treats the return value as string and doesn't unify it with unknown)
      __type__: "var" as ExpressionType,
      __value__: newValue,
    };
  },
};

const removeOption: OmitOption = {
  label: "Remove",
  value: "omit",
  symbol: <OptionIcon icon="exclude" />,
  Widget: OmitFieldWidget,
};

const excludeOption: OmitOption = {
  label: "Exclude",
  value: "omit",
  symbol: <OptionIcon icon="exclude" />,
  Widget: OmitFieldWidget,
};

type ToggleOptionInputs = {
  fieldSchema: Schema;
  isRequired: boolean;
  customToggleModes: CustomFieldToggleMode[];
  isObjectProperty: boolean;
  isArrayItem: boolean;
  allowExpressions: boolean;
};

function getToggleOptions({
  fieldSchema,
  isRequired,
  customToggleModes,
  isObjectProperty,
  isArrayItem,
  allowExpressions,
}: ToggleOptionInputs): InputModeOption[] {
  let options: InputModeOption[] = [];

  function pushOptions(...newOptions: InputModeOption[]) {
    for (const newOption of newOptions) {
      const existingOption = getOptionForInputMode(options, newOption.value);

      if (!existingOption) {
        options.push(newOption);
      } else if (
        existingOption.value !== "omit" &&
        existingOption.label === newOption.label
      ) {
        // Handle the case where the field supports anyOf/oneOf where the sub-schemas have different documentation.
        options = options.filter((x) => x.value !== newOption.value);
        options.push({
          ...existingOption,
          description: "Multiple input data types supported",
        });
      }
    }
  }

  const textOption: StringOption = {
    label: "Text",
    value: "string",
    symbol: <OptionIcon icon="text" />,
    Widget: TextWidget,
    interpretValue: (oldValue: unknown) => {
      let newValue =
        typeof fieldSchema.default === "string" ? fieldSchema.default : "";
      if (typeof oldValue === "string" && oldValue.length > 0) {
        newValue = oldValue;
      } else if (typeof oldValue === "number" && oldValue > 0) {
        newValue = String(oldValue);
      } else if (
        isTemplateExpression(oldValue) &&
        oldValue.__value__.length > 0
      ) {
        newValue = oldValue.__value__;
      }

      return allowExpressions
        ? {
            // Cast as ExpressionType because without it there's a type error compiling in the app project. (Because
            // Typescript treats the return value as string and doesn't unify it with unknown)
            __type__: "nunjucks" as ExpressionType,
            __value__: newValue,
          }
        : newValue;
    },
  };

  if (isKeyStringField(fieldSchema)) {
    return [textOption, excludeOption];
  }

  for (const mode of customToggleModes) {
    // eslint-disable-next-line unicorn/prefer-regexp-test -- ?? not using String.match()
    if (mode.match(fieldSchema)) {
      pushOptions(mode.option);
    }
  }

  const multiSchemas = [
    ...(fieldSchema.anyOf ?? []),
    ...(fieldSchema.oneOf ?? []),
    ...(fieldSchema.allOf ?? []),
  ];

  const anyType = isEmpty(multiSchemas) && !fieldSchema.type;

  if (Array.isArray(fieldSchema.type)) {
    const { type: typeArray, ...rest } = fieldSchema;
    for (const type of typeArray) {
      const optionSet = getToggleOptions({
        fieldSchema: { type, ...rest },
        isRequired,
        customToggleModes,
        isObjectProperty,
        isArrayItem,
        allowExpressions,
      });
      pushOptions(...optionSet);
    }
  }

  if (fieldSchema.type === "array" || anyType) {
    // Don't allow editing array fields nested inside objects/arrays
    const Widget =
      isObjectProperty || isArrayItem ? ComplexObjectWidget : ArrayWidget;
    pushOptions({
      label: "Array items",
      value: "array",
      symbol: <OptionIcon icon="array" />,
      Widget,
      interpretValue: () =>
        Array.isArray(fieldSchema.default) ? fieldSchema.default : [],
    });
    if (allowExpressions) {
      pushOptions(varOption);
    }
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
    pushOptions({
      label: "Object properties",
      value: "object",
      symbol: <OptionIcon icon="object" />,
      Widget,
      interpretValue: () =>
        (typeof fieldSchema.default === "object"
          ? fieldSchema.default
          : {}) as UnknownObject,
    });
    if (allowExpressions) {
      pushOptions(varOption);
    }
  }

  if (fieldSchema.type === "boolean" || anyType) {
    pushOptions({
      label: "Toggle",
      value: "boolean",
      symbol: <OptionIcon icon="toggle" />,
      Widget: BooleanWidget,
      interpretValue: () =>
        typeof fieldSchema.default === "boolean" ? fieldSchema.default : false,
    });
    if (allowExpressions) {
      pushOptions(varOption);
    }
  }

  if (isSelectField(fieldSchema)) {
    pushOptions({
      label: "Select...",
      value: "select",
      symbol: <OptionIcon icon="select" />,
      Widget: SchemaSelectWidget,
      interpretValue: () =>
        typeof fieldSchema.default === "string"
          ? String(fieldSchema.default)
          : null,
    });
  }

  if (fieldSchema.type === "string" || anyType) {
    pushOptions(textOption);
    if (allowExpressions) {
      pushOptions(varOption);
    }
  }

  // Don't include integer for "anyType", only include number, which can also accept integers
  if (fieldSchema.type === "integer") {
    pushOptions({
      label: "Whole number",
      value: "number",
      symbol: <OptionIcon icon="number" />,
      Widget: IntegerWidget,
      interpretValue: (oldValue: unknown) => {
        let int = Number.NaN;
        if (typeof oldValue === "string") {
          int = Number.parseInt(oldValue, 10);
        }

        if (isTemplateExpression(oldValue)) {
          int = Number.parseInt(oldValue.__value__, 10);
        }

        if (!Number.isNaN(int)) {
          return int;
        }

        return typeof fieldSchema.default === "number"
          ? fieldSchema.default
          : 0;
      },
    });
    if (allowExpressions) {
      pushOptions(varOption);
    }
  }

  if (fieldSchema.type === "number" || anyType) {
    pushOptions({
      label: "Number",
      value: "number",
      symbol: <OptionIcon icon="number" />,
      Widget: NumberWidget,
      interpretValue: (oldValue: unknown) => {
        let float = Number.NaN;
        if (typeof oldValue === "string") {
          float = Number.parseFloat(oldValue);
        }

        if (isTemplateExpression(oldValue)) {
          float = Number.parseFloat(oldValue.__value__);
        }

        if (!Number.isNaN(float)) {
          return float;
        }

        return typeof fieldSchema.default === "number"
          ? fieldSchema.default
          : 0;
      },
    });
    if (allowExpressions) {
      pushOptions(varOption);
    }
  }

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
      allowExpressions,
    }).map((option) => {
      option.description = subSchema.description;
      return option;
    });
  });
  if (!isEmpty(multiOptions)) {
    pushOptions(...multiOptions);
  }

  if (!isRequired) {
    if (isArrayItem) {
      pushOptions(removeOption);
    } else {
      pushOptions(excludeOption);
    }
  }

  return sortBy(options, (opt: InputModeOption) => opt.value === "omit");
}

export function schemaSupportsTemplates(schema: Schema): boolean {
  const options = getToggleOptions({
    fieldSchema: schema,
    isRequired: false,
    customToggleModes: [],
    isObjectProperty: false,
    isArrayItem: false,
    allowExpressions: true,
  });
  return options.some(
    (option) => option.value === "string" && option.label === "Text"
  );
}

export function isKeyStringField(schema: Schema): boolean {
  return schema.$ref === "https://app.pixiebrix.com/schemas/key#";
}

const BasicSchemaField: SchemaFieldComponent = (props) => {
  const {
    name,
    schema,
    isRequired,
    description,
    isObjectProperty = false,
    isArrayItem = false,
    hideLabel,
  } = props;
  const fieldLabel = makeLabelForSchemaField(props);
  const defaultDescription = useMemo(() => description ?? schema.description, [
    description,
    schema.description,
  ]);
  const [fieldDescription, setFieldDescription] = useState<React.ReactNode>(
    defaultDescription
  );

  const updateFieldDescription = useCallback(
    (newDescription: string | undefined) => {
      setFieldDescription(newDescription ?? defaultDescription);
    },
    [defaultDescription]
  );

  const { customToggleModes } = useContext(SchemaFieldContext);
  const { allowExpressions } = useContext(FieldRuntimeContext);

  const normalizedSchema = useMemo(() => {
    const isObjectType =
      schema.type === "object" ||
      !Object.prototype.hasOwnProperty.call(schema, "type");

    if (
      isObjectType &&
      schema.properties === undefined &&
      schema.additionalProperties === undefined &&
      schema.oneOf === undefined &&
      schema.anyOf === undefined &&
      schema.allOf === undefined
    ) {
      return {
        ...schema,
        additionalProperties: true,
      };
    }

    return schema;
  }, [schema]);

  const inputModeOptions = useMemo(
    () =>
      getToggleOptions({
        fieldSchema: normalizedSchema,
        isRequired,
        customToggleModes,
        isObjectProperty,
        isArrayItem,
        allowExpressions,
      }),
    [
      normalizedSchema,
      isRequired,
      customToggleModes,
      isObjectProperty,
      isArrayItem,
      allowExpressions,
    ]
  );

  const [{ value }, { error, touched }, { setValue }] = useField(name);

  useEffect(() => {
    // Initialize any undefined required fields to prevent inferring an "omit" input
    if (value === undefined && isRequired && !isEmpty(inputModeOptions)) {
      setValue(inputModeOptions[0].interpretValue(value));
    }
    // We only want to run this on mount, but also for some reason, sometimes the formik
    // helpers reference (setValue) changes, so we need to account for that in the dependencies
    // See: https://github.com/pixiebrix/pixiebrix-extension/issues/2269
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setValue]);

  if (isEmpty(inputModeOptions)) {
    return (
      <FieldTemplate
        name={name}
        label={fieldLabel}
        description={fieldDescription}
        error={error}
        touched={touched}
        as={UnsupportedWidget}
      />
    );
  }

  return (
    <FieldTemplate
      name={name}
      label={fieldLabel}
      description={fieldDescription}
      className={cx({ "mb-0": hideLabel })} // Remove bottom margin if we're already hiding the label
      as={TemplateToggleWidget}
      inputModeOptions={inputModeOptions}
      setFieldDescription={updateFieldDescription}
      {...props}
      // Pass in schema after spreading props to override the non-normalized schema in props
      schema={normalizedSchema}
    />
  );
};

export default BasicSchemaField;
