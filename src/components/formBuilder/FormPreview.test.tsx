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

import { Schema, UiSchema } from "@/core";
import testItRenders, { ItRendersOptions } from "@/tests/testItRenders";
import { Form, Formik } from "formik";
import React, { PropsWithChildren } from "react";
import { RJSFSchema } from "./formBuilderTypes";
import FormPreview, { FormPreviewProps } from "./FormPreview";

const rjsfSchemaPropertyName = "rjsfSchema";

describe("FormPreview", () => {
  const defaultProps: Partial<FormPreviewProps> = {
    name: rjsfSchemaPropertyName,
    setActiveField: jest.fn(),
  };

  const createFormikTemplate = (rjsfSchema: RJSFSchema) => {
    const FormikTemplate = ({ children }: PropsWithChildren<never>) => (
      <Formik
        initialValues={{
          [rjsfSchemaPropertyName]: rjsfSchema,
        }}
        onSubmit={jest.fn()}
      >
        <Form>{children}</Form>
      </Formik>
    );
    FormikTemplate.displayName = "FormikTemplate";
    return FormikTemplate;
  };

  testItRenders({
    testName: "it renders empty schema",
    Component: FormPreview,
    props: defaultProps,
    TemplateComponent: createFormikTemplate({} as RJSFSchema),
  });

  testItRenders(() => {
    const schema: Schema = {
      title: "A form",
      description: "A form example.",
      type: "object",
      properties: {
        firstName: {
          type: "string",
          title: "First name",
          default: "Chuck",
        },
        age: {
          type: "number",
          title: "Age",
        },
        telephone: {
          type: "string",
          title: "Telephone",
        },
      },
    };
    const uiSchema: UiSchema = {};

    const options: ItRendersOptions<FormPreviewProps> = {
      testName: "it renders simple schema",
      Component: FormPreview,
      props: {
        ...defaultProps,
        activeField: "firstName",
      } as FormPreviewProps,
      TemplateComponent: createFormikTemplate({
        schema,
        uiSchema,
      } as RJSFSchema),
    };

    return options;
  });
});
