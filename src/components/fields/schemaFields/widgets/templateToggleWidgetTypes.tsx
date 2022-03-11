import React from "react";
import { FieldInputMode } from "@/components/fields/schemaFields/fieldInputMode";
import { Expression } from "@/core";
import { UnknownObject } from "@/types";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { JSONSchema7Array } from "json-schema";

interface InputModeOptionBase<
  TValue extends FieldInputMode,
  As extends React.ElementType = React.ElementType
> {
  label: string;
  value: TValue;
  symbol: React.ReactNode;
  Widget: As;
  description?: React.ReactNode;
  interpretValue?: (oldValue: unknown) => unknown;
}

export type StringOption = InputModeOptionBase<"string" | "select" | "var"> & {
  interpretValue: (oldValue: unknown) => string | Expression;
};
export type NumberOption = InputModeOptionBase<"number"> & {
  interpretValue: (oldValue: unknown) => number;
};
export type BooleanOption = InputModeOptionBase<"boolean"> & {
  interpretValue: (oldValue: unknown) => boolean;
};
export type ArrayOption = InputModeOptionBase<"array"> & {
  interpretValue: (oldValue: unknown) => JSONSchema7Array;
};
export type ObjectOption = InputModeOptionBase<"object"> & {
  interpretValue: (oldValue: unknown) => UnknownObject;
};
export type OmitOption = InputModeOptionBase<"omit">;

export type InputModeOption =
  | StringOption
  | NumberOption
  | BooleanOption
  | ArrayOption
  | ObjectOption
  | OmitOption;

export type TemplateToggleWidgetProps = SchemaFieldProps & {
  inputModeOptions: InputModeOption[];
  setFieldDescription: (description: React.ReactNode) => void;
};
