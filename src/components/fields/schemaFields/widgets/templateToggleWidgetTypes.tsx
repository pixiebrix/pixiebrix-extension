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
