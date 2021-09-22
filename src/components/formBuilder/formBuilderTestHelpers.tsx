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

import { Form, Formik } from "formik";
import React, { PropsWithChildren } from "react";
import { RJSFSchema } from "./formBuilderTypes";

export const RJSF_SCHEMA_PROPERTY_NAME = "rjsfSchema";

export const createFormikTemplate = (rjsfSchema: RJSFSchema) => {
  const FormikTemplate = ({ children }: PropsWithChildren<unknown>) => (
    <Formik
      initialValues={{
        [RJSF_SCHEMA_PROPERTY_NAME]: rjsfSchema,
      }}
      onSubmit={jest.fn()}
    >
      <Form>{children}</Form>
    </Formik>
  );
  FormikTemplate.displayName = "FormikTemplate";
  return FormikTemplate;
};
