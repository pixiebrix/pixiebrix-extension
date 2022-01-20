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

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FieldInputMode } from "@/components/fields/schemaFields/fieldInputMode";
import { Expression } from "@/core";
import { Dropdown, DropdownButton } from "react-bootstrap";
import { UnknownObject } from "@/types";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { JSONSchema7Array } from "json-schema";
import WidgetLoadingIndicator from "@/components/fields/schemaFields/widgets/WidgetLoadingIndicator";
import styles from "./TemplateToggleWidget.module.scss";
import useToggleFormField from "@/devTools/editor/hooks/useToggleFormField";
import { useField } from "formik";

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

type TemplateToggleWidgetProps = SchemaFieldProps & {
  inputModeOptions: InputModeOption[];
  setFieldDescription: (description: React.ReactNode) => void;
};

export function getOptionForInputMode(
  options: InputModeOption[],
  inputMode: FieldInputMode
): InputModeOption | null {
  return options.find((option) => option.value === inputMode) ?? null;
}

/**
 * Show a field toggle that lets a user choose the type of data input, along with the chosen input
 *
 * @param inputModeOptions Options for types of inputs allowed for this field
 * @param setFieldDescription Setter to handle changing the field description based on which option is toggled
 * @param props SchemaFieldProps
 */
const TemplateToggleWidget: React.FC<TemplateToggleWidgetProps> = ({
  inputModeOptions,
  setFieldDescription,
  ...schemaFieldProps
}) => {
  const [{ value }, , { setValue }] = useField(schemaFieldProps.name);
  const { inputMode, onOmitField } = useToggleFormField(
    schemaFieldProps.name,
    schemaFieldProps.schema
  );
  const selectedOption = inputModeOptions.find((x) => x.value === inputMode);
  const Widget = selectedOption?.Widget ?? WidgetLoadingIndicator;
  const [focusInput, setFocusInput] = useState(false);

  useEffect(() => {
    setFocusInput(false);
    const option = getOptionForInputMode(inputModeOptions, inputMode);
    setFieldDescription(option?.description);
  }, [inputMode, inputModeOptions, setFieldDescription]);

  const onModeChange = useCallback(
    (newInputMode: FieldInputMode) => {
      if (newInputMode === inputMode) {
        // Don't execute anything on "re-select", we don't want to
        // overwrite the field with the default value again.
        return;
      }

      if (newInputMode === "omit") {
        onOmitField();
        return;
      }

      const { interpretValue } = getOptionForInputMode(
        inputModeOptions,
        newInputMode
      );

      // Already handled "omit" and returned above
      setValue(interpretValue(value));
      setFocusInput(true);
    },
    [inputMode, inputModeOptions, setValue, value, onOmitField]
  );

  const widgetProps = useMemo<SchemaFieldProps>(() => {
    schemaFieldProps.focusInput = focusInput;
    return inputMode === "omit"
      ? {
          ...schemaFieldProps,
          onClick: () => {
            if (inputModeOptions.some((option) => option.value === "var")) {
              onModeChange("var");
            }

            if (inputModeOptions.some((option) => option.value === "string")) {
              onModeChange("string");
            }
          },
        }
      : schemaFieldProps;
  }, [focusInput, inputMode, onModeChange, schemaFieldProps]);

  return (
    <div className={styles.root}>
      <div className={styles.field}>
        <Widget {...widgetProps} />
      </div>
      <DropdownButton
        title={
          <span className={styles.symbol}>{selectedOption?.symbol ?? ""}</span>
        }
        variant="link"
        alignRight
        onSelect={onModeChange}
        className={styles.dropdown}
        data-testid={`toggle-${schemaFieldProps.name}`}
        data-test-selected={selectedOption?.label ?? ""}
      >
        {inputModeOptions.map((option) => (
          <Dropdown.Item
            key={option.value}
            eventKey={option.value}
            data-testid={option.value}
          >
            <span className={styles.symbol}>{option.symbol}</span>{" "}
            {option.label}
          </Dropdown.Item>
        ))}
      </DropdownButton>
    </div>
  );
};

export default React.memo(TemplateToggleWidget);
