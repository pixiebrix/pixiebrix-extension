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

import { randomWords } from "@/tests/testHelpers";
import { render } from "@testing-library/react";
import { Form, Formik } from "formik";
import React, { PropsWithChildren } from "react";
import FormEditor, { FormEditorProps } from "./FormEditor";

type ItRendersOptions<TProps> = {
  Component: React.ComponentType<TProps>;
  props: TProps;
  testName?: string;
  TemplateComponent?: React.ComponentType<PropsWithChildren<unknown>>;
};
function testItRenders<TProps = unknown>(options: ItRendersOptions<TProps>) {
  const {
    Component,
    props,
    testName = "It renders",
    TemplateComponent,
  } = options;

  test(testName, () => {
    const ui = TemplateComponent ? (
      <TemplateComponent>
        <Component {...props} />
      </TemplateComponent>
    ) : (
      <Component {...props} />
    );
    const rendered = render(ui);
    expect(rendered.asFragment()).toMatchSnapshot();
  });
}

const rjsfSchemaPropertyName = "rjsfSchema";

describe("FormEditor", () => {
  const defaultProps: Partial<FormEditorProps> = {
    name: rjsfSchemaPropertyName,
    setActiveField: jest.fn(),
  };

  const FormikTemplate = ({ children }: PropsWithChildren<never>) => (
    <Formik
      initialValues={{
        [rjsfSchemaPropertyName]: {},
      }}
      onSubmit={jest.fn()}
    >
      <Form>{children}</Form>
    </Formik>
  );

  testItRenders({
    Component: FormEditor,
    props: defaultProps,
    TemplateComponent: FormikTemplate,
  });
});
