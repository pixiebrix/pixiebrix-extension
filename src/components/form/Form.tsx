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

import styles from "./Form.module.scss";

import React, { ReactElement } from "react";
import { Button, Form as BootstrapForm } from "react-bootstrap";
import { Formik, FormikHelpers, FormikValues } from "formik";
import * as yup from "yup";

export type OnSubmit<TValues = FormikValues> = (
  values: TValues,
  formikHelpers: FormikHelpers<TValues>
) => void | Promise<unknown>;

export type RenderBody = (state: {
  isValid: boolean;
  values: FormikValues;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type from Formik
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
}) => ReactElement;

export type RenderSubmit = (state: {
  isSubmitting: boolean;
  isValid: boolean;
  values: FormikValues;
}) => ReactElement;

export type RenderStatus = (state: { status: string }) => ReactElement;

type FormProps = {
  initialValues: FormikValues;
  validationSchema: yup.AnyObjectSchema;
  validateOnMount?: boolean;
  enableReinitialize?: boolean;
  renderBody?: RenderBody;
  renderSubmit?: RenderSubmit;
  renderStatus?: RenderStatus;
  onSubmit: OnSubmit;
};

const defaultRenderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
  <Button type="submit" disabled={!isValid || isSubmitting}>
    Submit
  </Button>
);

const defaultRenderStatus: RenderStatus = ({ status }) => (
  <div className={styles.status}>{status}</div>
);

const Form: React.FC<FormProps> = ({
  initialValues,
  validationSchema,
  validateOnMount,
  enableReinitialize,
  children,
  renderBody,
  renderSubmit = defaultRenderSubmit,
  renderStatus = defaultRenderStatus,
  onSubmit,
}) => (
  <Formik
    initialValues={initialValues}
    validationSchema={validationSchema}
    validateOnMount={validateOnMount}
    enableReinitialize={enableReinitialize}
    onSubmit={onSubmit}
  >
    {({
      handleSubmit,
      isSubmitting,
      isValid,
      values,
      status,
      setFieldValue,
    }) => (
      <BootstrapForm noValidate onSubmit={handleSubmit}>
        {status && renderStatus({ status })}
        {renderBody ? renderBody({ isValid, values, setFieldValue }) : children}
        {renderSubmit({ isSubmitting, isValid, values })}
      </BootstrapForm>
    )}
  </Formik>
);

export default Form;
