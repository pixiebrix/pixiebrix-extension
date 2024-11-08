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

import { type ChangeEvent, type FocusEvent, useState } from "react";
import {
  ariaDescribedByIds,
  type BaseInputTemplateProps,
  examplesId,
  type FormContextType,
  getInputProps,
  type StrictRJSFSchema,
  type InputPropsType,
  type RJSFSchema,
} from "@rjsf/utils";
import React from "react";
import { FormControl, type FormControlProps } from "react-bootstrap";
import { freeze } from "../../utils/objectUtils";

// RJSF's BaseInputTemplateProps is overly permissive. Tightening it up here.
export interface StrictBaseInputTemplateProps<
  T = HTMLInputElement,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = UnknownObject,
> extends BaseInputTemplateProps<T, S, F> {
  extraProps?: InputPropsType;
  type?: string;
  value: string | number;
}

/* eslint-disable-next-line security/detect-unsafe-regex -- @graham: this was the best/fastest regex I was able to
 * come up with, but a better regex-er might be able to improve it and eliminate the need to disable. */
const DEFAULT_NUMBER_REGEX = /^-?\d*(?:\.\d*)?(?:[Ee][+-]?\d*)?$/;

/**
 * @since 1.8.7
 * Used for number inputs to store the value as a string
 * to avoid losing decimals during the conversion to number
 */
function useNumericInput<
  T = HTMLInputElement,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = UnknownObject,
>({
  value,
  extraProps,
  schema,
  type,
  options,
}: {
  value: string | number;
  extraProps?: InputPropsType;
  schema: S;
  type?: string;
  options: StrictBaseInputTemplateProps<T, S, F>["options"];
}) {
  const [storedValue, setStoredValue] = useState(value?.toString() ?? "");

  const inputProps: FormControlProps & {
    step?: number | "any";
    inputMode?: "numeric";
  } = {
    ...extraProps,
    ...getInputProps<T, S, F>(schema, type, options),
  };

  // Converting number inputs to text inputs with numeric inputMode
  // Removes the spinner to improve UX
  // See https://github.com/pixiebrix/pixiebrix-extension/issues/7343
  if (inputProps.type === "number") {
    inputProps.step = undefined;
    inputProps.type = "text";
    inputProps.inputMode = "numeric";
  }

  return { storedValue, setStoredValue, inputProps };
}

function getValue(
  value: string | number,
  storedValue?: string | number,
  type?: "numeric",
): string | number {
  if (type === "numeric") {
    return storedValue ?? "";
  }

  return value || value === 0 ? value : "";
}

const EMPTY_ARRAY = freeze<string[]>([]);

export default function BaseInputTemplate<
  T = HTMLInputElement,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = UnknownObject,
>({
  id,
  placeholder,
  required,
  readonly,
  disabled,
  type,
  value,
  onChange,
  onChangeOverride,
  onBlur,
  onFocus,
  autofocus,
  options,
  schema,
  rawErrors = EMPTY_ARRAY,
  children,
  extraProps,
}: StrictBaseInputTemplateProps<T, S, F>) {
  const { storedValue, setStoredValue, inputProps } = useNumericInput<T, S, F>({
    value,
    extraProps,
    schema,
    type,
    options,
  });

  const _onChange = ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
    let _value: string | number = value;

    if (
      inputProps.inputMode === "numeric" &&
      // Tried to pass regex as a pattern, but it didn't prevent invalid keystrokes
      DEFAULT_NUMBER_REGEX.test(value)
    ) {
      setStoredValue(value);
      _value = Number.parseFloat(value);
    }

    onChange(_value === "" ? options.emptyValue : _value);
  };

  const _onBlur = ({ target: { value } }: FocusEvent<HTMLInputElement>) => {
    onBlur(id, value);
  };

  const _onFocus = ({ target: { value } }: FocusEvent<HTMLInputElement>) => {
    onFocus(id, value);
  };

  return (
    <>
      <FormControl
        id={id}
        name={id}
        placeholder={placeholder}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- Maintaining consistent behavior with RJSF
        autoFocus={autofocus}
        required={required}
        disabled={disabled}
        readOnly={readonly}
        className={rawErrors.length > 0 ? "is-invalid" : ""}
        list={schema.examples ? examplesId<T>(id) : undefined}
        {...inputProps}
        value={getValue(value, storedValue, inputProps.inputMode)}
        onChange={onChangeOverride || _onChange}
        onBlur={_onBlur}
        onFocus={_onFocus}
        aria-describedby={ariaDescribedByIds<T>(id, Boolean(schema.examples))}
      />
      {children}
      {Array.isArray(schema.examples) ? (
        <datalist id={examplesId<T>(id)}>
          {[
            ...(schema.examples as string[]),
            ...(schema.default && !schema.examples.includes(schema.default)
              ? ([schema.default] as string[])
              : []),
          ].map((example: string) => (
            <option key={example} value={example} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}
