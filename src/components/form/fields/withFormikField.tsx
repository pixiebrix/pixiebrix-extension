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
import { useField } from "formik";
import { HorizontalTextFieldProps } from "./HorizontalTextField";
import { Except } from "type-fest";

export const withFormikField = (
  Component:
    | React.ComponentClass<HorizontalTextFieldProps>
    | React.FC<HorizontalTextFieldProps>
) => (
  props: Except<
    HorizontalTextFieldProps,
    "value" | "error" | "touched" | "onChange" | "onBlur"
  >
) => {
  const [field, { error, touched }] = useField(props.name);

  // Explicit const is required to satisfy the rule:
  // Component definition is missing display name - eslintreact/display-name
  const ComponentWithFormikField = (
    <Component {...props} {...field} error={error} touched={touched} />
  );
  return ComponentWithFormikField;
};
