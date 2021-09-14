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
import Field, { FieldProps } from "@/components/form/Field";
import { FormikContextType } from "formik/dist/types";

export type FormikFieldProps<Values> = FieldProps & { formik: FormikContextType<Values> }

function FormikField<Values>(props: FormikFieldProps<Values>) {
  const fieldProps: FieldProps = props;

  const { formik }: { formik: FormikContextType<Values>} = props;

  const error = getIn(formik.errors, props.name);
  const touched = getIn(formik.touched, props.name);

  return (
    <Field
      {...fieldProps}
      error={error}
      touched={touched}
    />
  );
}

export default connect<FieldProps>(FormikField);
