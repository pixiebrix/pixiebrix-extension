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

import React from "react";
import { FieldInputProps, useField } from "formik";

export type WithFormikFieldProps = {
  name: string;
};
export type WithFormikFieldDefaultProps<TValue> = WithFormikFieldProps &
  FieldInputProps<TValue> & {
    error?: string;
    touched: boolean;
  };

// Own = Not injected props
type OwnProps<
  TValue,
  TProps extends WithFormikFieldProps = WithFormikFieldDefaultProps<TValue>
  // eslint-disable-next-line @typescript-eslint/ban-types -- using Omit to be more relaxed on the component's TProps
> = Omit<
  TProps,
  "value" | "checked" | "onChange" | "onBlur" | "error" | "touched"
>;

export function withFormikField<
  TValue,
  TProps extends WithFormikFieldProps = WithFormikFieldDefaultProps<TValue>
>(Component: React.FC<TProps>) {
  return (props: OwnProps<TValue, TProps>) => {
    const [{ value, ...restField }, { error, touched }] = useField<TValue>(
      props.name
    );

    const displayValue = typeof value === "undefined" ? "" : value;

    // Explicit const is required to satisfy the rule:
    // Component definition is missing display name - eslintreact/display-name
    const ComponentWithFormikField = (
      // @ts-expect-error -- disabling type mismatch warning
      <Component
        {...props}
        value={displayValue}
        {...restField}
        error={error}
        touched={touched}
      />
    );
    return ComponentWithFormikField;
  };
}
