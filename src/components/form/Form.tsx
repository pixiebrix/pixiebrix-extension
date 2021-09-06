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

import React, { ReactElement } from "react";
import { Button, Form as BootstrapForm } from "react-bootstrap";
import { Formik, FormikHelpers, FormikValues } from "formik";
import * as yup from "yup";

export type OnSubmit<TValues = FormikValues> = (
  values: TValues,
  formikHelpers: FormikHelpers<TValues>
) => void | Promise<unknown>;

export type RenderSubmit = (state: {
  isSubmitting: boolean;
  isValid: boolean;
  values: FormikValues;
}) => ReactElement;

type FormProps = {
  initialValues: FormikValues;
  validationSchema: yup.ObjectSchema;
  validateOnMount?: boolean;
  renderSubmit?: RenderSubmit;
  onSubmit: OnSubmit;
};

const defaultRenderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
  <Button type="submit" disabled={!isValid || isSubmitting}>
    Submit
  </Button>
);

const Form: React.FC<FormProps> = ({
  initialValues,
  validationSchema,
  validateOnMount,
  children,
  renderSubmit = defaultRenderSubmit,
  onSubmit,
}) => (
  <Formik
    initialValues={initialValues}
    validationSchema={validationSchema}
    validateOnMount={validateOnMount}
    onSubmit={onSubmit}
  >
    {({ handleSubmit, isSubmitting, isValid, values, status }) => (
      <BootstrapForm noValidate onSubmit={handleSubmit}>
        {status && <div className="text-danger mb-3">{status}</div>}
        {children}
        {renderSubmit({ isSubmitting, isValid, values })}
      </BootstrapForm>
    )}
  </Formik>
);

export default Form;
