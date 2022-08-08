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

import React from "react";
import { connect, getIn } from "formik";
import FieldTemplate, { FieldProps } from "@/components/form/FieldTemplate";
import { FormikContextType } from "formik/dist/types";
import useFieldError from "./useFieldError";

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- https://github.com/typescript-eslint/typescript-eslint/issues/5407
export type ConnectedFieldProps<Values> = FieldProps & {
  formik: FormikContextType<Values>;
};

const FormikFieldTemplate = <Values,>({
  formik,
  ...fieldProps
}: ConnectedFieldProps<Values>) => {
  const error = useFieldError(fieldProps.name);
  const touched = getIn(formik.touched, fieldProps.name);
  const value = getIn(formik.values, fieldProps.name);

  return (
    <FieldTemplate
      value={value}
      error={error}
      touched={touched}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      {...fieldProps}
    />
  );
};

export default connect<FieldProps>(FormikFieldTemplate);
