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

import React, { type FocusEventHandler, useCallback, forwardRef } from "react";
import { Form, type FormControlProps } from "react-bootstrap";
import { useField } from "formik";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import useAutoFocus from "@/hooks/useAutoFocus";
import useForwardedRef from "@/hooks/useForwardedRef";

/**
 * A basic input widget for numbers
 *
 * @see: IntegerWidget
 */
const NumberWidget: React.ForwardRefRenderFunction<
  HTMLInputElement,
  SchemaFieldProps &
    FormControlProps & {
      step?: number;
    }
> = (
  {
    name,
    schema,
    isRequired,
    uiSchema,
    hideLabel,
    isObjectProperty,
    isArrayItem,
    focusInput,
    step,
    ...restProps
  },
  forwardRef
) => {
  const [field, , { setValue }] = useField<number>(name);

  const inputRef = useForwardedRef(forwardRef);
  useAutoFocus(inputRef, focusInput);

  const fitToStep: FocusEventHandler<HTMLInputElement> = useCallback(() => {
    const numberValue = Number(field.value);
    const newValue = Math.round(numberValue / step) * step;
    setValue(newValue);
  }, [setValue, field.value, step]);

  return (
    // Spread the input props first so that we override the explicit ones below
    <Form.Control
      {...restProps}
      {...field}
      type="number"
      onBlur={step ? fitToStep : null}
      step={step}
      ref={inputRef}
    />
  );
};

export default forwardRef(NumberWidget);
