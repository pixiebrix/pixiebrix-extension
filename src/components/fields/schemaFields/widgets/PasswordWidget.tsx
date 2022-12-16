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
import { Form, type FormControlProps } from "react-bootstrap";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useField } from "formik";

const PasswordWidget: React.VFC<SchemaFieldProps & FormControlProps> = ({
  name,
  schema,
  isRequired,
  uiSchema,
  hideLabel,
  isObjectProperty,
  isArrayItem,
  focusInput,
  inputRef: inputRefProp,
  ...restProps
}) => {
  const [{ value: formValue }, , { setValue: setFormValue }] =
    useField<string>(name);
  const [value, setValue] = useState<string>(String(formValue));

  const inputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (focusInput) {
      inputRef.current?.focus();
    }
  }, [focusInput]);

  useEffect(() => {
    // Sync the ref values
    if (inputRefProp) {
      inputRefProp.current = inputRef.current;
    }
  }, [inputRef.current]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    ({ target }) => {
      setValue(target.value);
    },
    []
  );

  const onBlur: FocusEventHandler<HTMLInputElement> = useCallback(() => {
    setFormValue(value);
    setValue(value);
  }, [setFormValue, value]);

  return (
    <Form.Control
      {...restProps}
      type="password"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      ref={inputRef}
    />
  );
};

export default PasswordWidget;
