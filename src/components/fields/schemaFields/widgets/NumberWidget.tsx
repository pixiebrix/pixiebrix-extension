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
  FocusEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Form, FormControlProps } from "react-bootstrap";
import { useField } from "formik";
import { round } from "lodash";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";

/**
 * A basic input widget for numbers
 *
 * @see: IntegerWidget
 */
const NumberWidget: React.FC<
  SchemaFieldProps &
    FormControlProps & {
      step?: number;
    }
> = ({
  name,
  schema,
  isRequired,
  uiSchema,
  hideLabel,
  isObjectProperty,
  isArrayItem,
  onClick,
  focusInput,
  step,
  ...restProps
}) => {
  const [{ value: formValue }, , { setValue: setFormValue }] =
    useField<number>(name);
  const [value, setValue] = useState<string>(String(formValue));

  const inputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (focusInput) {
      inputRef.current?.focus();
    }
  }, [focusInput]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    ({ target }) => {
      setValue(target.value);
    },
    []
  );

  const onBlur: FocusEventHandler<HTMLInputElement> = useCallback(() => {
    const numberValue = Number(value);
    const newValue = step ? round(numberValue / step) * step : numberValue;
    setFormValue(newValue);
    setValue(String(newValue));
  }, [setFormValue, step, value]);

  return (
    // Spread the input props first so that we override the explicit ones below
    <Form.Control
      {...restProps}
      type="number"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      step={step ? String(step) : ""}
      ref={inputRef}
    />
  );
};

export default NumberWidget;
