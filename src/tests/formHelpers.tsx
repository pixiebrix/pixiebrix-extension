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

import { Form, Formik, FormikValues } from "formik";
import React, { PropsWithChildren } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { waitForEffect } from "@/tests/testHelpers";

export const RJSF_SCHEMA_PROPERTY_NAME = "rjsfSchema";

export const createFormikTemplate = (
  initialValues: FormikValues,
  onSubmit = jest.fn()
) => {
  const FormikTemplate = ({ children }: PropsWithChildren<unknown>) => (
    <Formik
      initialValues={initialValues}
      onSubmit={(values) => onSubmit(values)}
    >
      <Form>
        {children}
        <button type="submit">Submit</button>
      </Form>
    </Formik>
  );
  FormikTemplate.displayName = "FormikTemplate";
  return FormikTemplate;
};

export const fireFormSubmit = async () => {
  fireEvent.click(screen.getByRole("button", { name: /submit/i }));
  await waitForEffect();
};

export const fireTextInput = (input: Element, text: string) => {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.blur(input);
};
