import React from "react";
import { isEmpty, sortBy } from "lodash";
import {
  getOptionForInputMode,
  InputModeOption,
  OmitOption,
  StringOption,
} from "./widgets/TemplateToggleWidget";
import TextWidget from "./widgets/TextWidget";
import { ExpressionType, Schema } from "@/core";
import WorkshopMessageWidget from "./widgets/WorkshopMessageWidget";
import ArrayWidget from "./widgets/ArrayWidget";
import ObjectWidget from "./widgets/ObjectWidget";
import IntegerWidget from "./widgets/IntegerWidget";
import NumberWidget from "./widgets/NumberWidget";
import SchemaSelectWidget, {
  isSelectField,
} from "./widgets/SchemaSelectWidget";
import { isTemplateExpression } from "@/runtime/mapArgs";
import { UnknownObject } from "@/types";
import OptionIcon from "./optionIcon/OptionIcon";
import BooleanWidget from "./widgets/BooleanWidget";
import OmitFieldWidget from "./widgets/OmitFieldWidget";
import { CustomFieldToggleMode } from "./SchemaFieldContext";

type ToggleOptionInputs = {
  fieldSchema: Schema;
  isRequired: boolean;
  customToggleModes: CustomFieldToggleMode[];
  isObjectProperty: boolean;
  isArrayItem: boolean;
  allowExpressions: boolean;
};

const varOption: StringOption = {
  label: "Variable",
  value: "var",
  symbol: <OptionIcon icon="variable" />,
  Widget: TextWidget,
  interpretValue(oldValue: unknown) {
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

export function isKeyStringField(schema: Schema): boolean {
  return schema.$ref === "https://app.pixiebrix.com/schemas/key#";
}

export function getToggleOptions({
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
    interpretValue(oldValue: unknown) {
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
    return isRequired ? [textOption] : [textOption, excludeOption];
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
      isObjectProperty || isArrayItem ? WorkshopMessageWidget : ArrayWidget;
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
    const Widget = isObjectProperty ? WorkshopMessageWidget : ObjectWidget;
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
      interpretValue(oldValue: unknown) {
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
      interpretValue(oldValue: unknown) {
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
