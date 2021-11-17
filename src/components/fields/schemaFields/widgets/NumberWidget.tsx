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

import React, { FocusEventHandler, useCallback, useState } from "react";
import { Form, FormControlProps } from "react-bootstrap";
import { useField } from "formik";
import { round } from "lodash";

/**
 * A basic input widget for numbers
 *
 * @see: IntegerWidget
 */
const NumberWidget: React.FC<
  FormControlProps & {
    name: string;
    step?: number;
  }
> = ({ name, step, ...restProps }) => {
  const [{ value: formValue }, , { setValue: setFormValue }] = useField<number>(
    name
  );
  const [value, setValue] = useState<string>(String(formValue));

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setValue(e.target.value);
    },
    []
  );

  const onBlur: FocusEventHandler<HTMLInputElement> = useCallback(() => {
    const numberVal = Number(value);
    const newVal = step ? round(numberVal / step) * step : numberVal;
    setFormValue(newVal);
    setValue(String(newVal));
  }, [setFormValue, step, value]);

  return (
    <Form.Control
      type="number"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      step={step ? String(step) : ""}
      {...restProps}
    />
  );
};

export default NumberWidget;
