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
import { ConnectedFieldProps } from "@/components/form/ConnectedFieldTemplate";
import { connect, getIn } from "formik";
import { FieldProps } from "@/components/form/FieldTemplate";
import SwitchField from "@/components/form/SwitchField";

const FormikSwitchField = <Values,>({
  formik,
  ...fieldProps
}: ConnectedFieldProps<Values>) => {
  const error = getIn(formik.errors, fieldProps.name);
  const touched = getIn(formik.touched, fieldProps.name);
  const value = getIn(formik.values, fieldProps.name);

  return (
    <SwitchField
      value={value}
      error={error}
      touched={touched}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      {...fieldProps}
    />
  );
};

export default connect<FieldProps>(FormikSwitchField);
