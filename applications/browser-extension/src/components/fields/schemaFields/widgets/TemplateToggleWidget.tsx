/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import styles from "./TemplateToggleWidget.module.scss";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type FieldInputMode } from "../fieldInputMode";
import { Dropdown, DropdownButton } from "react-bootstrap";
import WidgetLoadingIndicator from "./WidgetLoadingIndicator";
import useToggleFormField from "@/hooks/useToggleFormField";
import { useField } from "formik";
import {
  type InputModeOption,
  type TemplateToggleWidgetProps,
} from "./templateToggleWidgetTypes";
import VarPopup from "./varPopup/VarPopup";

import { isTemplateExpression } from "../../../../utils/expressionUtils";
import { assertNotNullish } from "../../../../utils/nullishUtils";

export function getOptionForInputMode(
  options: InputModeOption[],
  inputMode: FieldInputMode | undefined,
): InputModeOption | null {
  if (inputMode == null) {
    return null;
  }

  return options.find((option) => option.value === inputMode) ?? null;
}

/**
 * Show a field toggle that lets a user choose the type of data input, along with the chosen input
 *
 * @param inputModeOptions Options for types of inputs allowed for this field
 * @param setFieldDescription Setter to handle changing the field description based on which option is toggled
 */
const TemplateToggleWidget: React.VFC<TemplateToggleWidgetProps> = ({
  inputModeOptions,
  setFieldDescription,
  defaultType,
  inputRef: inputRefProp,
  ...schemaFieldProps
}) => {
  const [{ value }, , { setValue }] = useField(schemaFieldProps.name);

  const { inputMode, onOmitField } = useToggleFormField(
    schemaFieldProps.name,
    schemaFieldProps.schema,
    schemaFieldProps.isRequired ?? false,
  );

  const defaultInputRef = useRef<HTMLElement>();
  const inputRef = inputRefProp ?? defaultInputRef;
  const selectedOption = useMemo(
    () => getOptionForInputMode(inputModeOptions, inputMode),
    [inputMode, inputModeOptions],
  );
  const Widget = selectedOption?.Widget ?? WidgetLoadingIndicator;
  const [focusInput, setFocusInput] = useState(false);

  useEffect(() => {
    setFocusInput(false);
    setFieldDescription(selectedOption?.description);
  }, [
    inputMode,
    inputModeOptions,
    setFieldDescription,
    selectedOption?.description,
  ]);

  const onModeChange = useCallback(
    async (newInputMode: FieldInputMode) => {
      if (newInputMode === inputMode) {
        // Don't execute anything on "re-select", we don't want to
        // overwrite the field with the default value again.
        return;
      }

      if (newInputMode === "omit") {
        onOmitField();
        return;
      }

      const option = getOptionForInputMode(inputModeOptions, newInputMode);

      assertNotNullish(
        option,
        `Option not found for input mode: ${newInputMode}`,
      );

      const { interpretValue } = option;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion --  Already handled "omit" and returned above
      await setValue(interpretValue!(value));
      setFocusInput(true);
    },
    [inputMode, inputModeOptions, setValue, value, onOmitField],
  );

  const widgetProps = {
    ...schemaFieldProps,
    focusInput,
    inputRef,
  };

  if (inputMode === "omit") {
    const optionValues = new Set(
      inputModeOptions.map((option) => option.value),
    );
    widgetProps.onClick = async (event) => {
      if (defaultType != null) {
        await onModeChange(defaultType);
      }

      // Order matters here, for ex. we want select to take precedence over string
      const fieldInputModePriorities: FieldInputMode[] = [
        "select",
        "string",
        "number",
        "boolean",
        "var",
        "array",
        "object",
      ];
      for (const fieldInputMode of fieldInputModePriorities) {
        if (optionValues.has(fieldInputMode)) {
          // eslint-disable-next-line no-await-in-loop -- awaiting doesn't matter here because of the break statement
          await onModeChange(fieldInputMode);
          break;
        }
      }
    };
  }

  const stringValue = isTemplateExpression(value) ? value.__value__ : "";
  const setNewValueFromString = useCallback(
    async (newValue: string) => {
      if (inputMode !== "var" && inputMode !== "string") {
        return;
      }

      assertNotNullish(selectedOption, `Option not found for ${inputMode}`);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Already handled "omit" by limiting to var or string
      await setValue(selectedOption.interpretValue!(newValue));
    },
    [inputMode, selectedOption, setValue],
  );

  const renderVarPopup = inputMode === "var" || inputMode === "string";

  return (
    <div className={styles.root}>
      <div className={styles.field}>
        <Widget {...widgetProps} />
        {renderVarPopup ? (
          <VarPopup
            inputMode={inputMode}
            // FIXME: define elementRef type from the SchemaField definition rather than inferring from inputMode
            inputElementRef={
              inputRef as React.MutableRefObject<
                HTMLInputElement | HTMLTextAreaElement
              >
            }
            value={stringValue}
            setValue={setNewValueFromString}
          />
        ) : null}
      </div>
      <DropdownButton
        title={
          <span className={styles.symbol}>{selectedOption?.symbol ?? ""}</span>
        }
        variant="link"
        disabled={inputModeOptions.length < 2}
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
