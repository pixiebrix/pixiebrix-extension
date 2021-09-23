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
import { connect, getIn } from "formik";
import FieldTemplate, { FieldProps } from "@/components/form/FieldTemplate";
import { FormikContextType } from "formik/dist/types";
import { Except } from "type-fest";

type ConnectedFieldProps = Except<
  FieldProps,
  "value" | "onChange" | "onBlur" | "error" | "touched"
>;

export type FormikFieldTemplateProps<Values> = FieldProps & {
  formik: FormikContextType<Values>;
};

const FormikFieldTemplate = <Values,>({
  formik,
  name,
  value,
  error,
  touched,
  onChange,
  onBlur,
  ...restFieldProps
}: FormikFieldTemplateProps<Values>) => {
  const formikValue = getIn(formik.values, name);
  const formikError = getIn(formik.errors, name);
  const formikTouched = getIn(formik.touched, name);

  return (
    <FieldTemplate
      name={name}
      value={formikValue}
      error={formikError}
      touched={formikTouched}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      {...restFieldProps}
    />
  );
};

export default connect<ConnectedFieldProps>(FormikFieldTemplate);
