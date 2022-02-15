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

import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { Schema } from "@/core";
import FormBuilder from "./FormBuilder";
import { action } from "@storybook/addon-actions";
import { Formik } from "formik";
import * as yup from "yup";
import { Button, Form as BootstrapForm } from "react-bootstrap";
import { UiSchema } from "@rjsf/core";

const schema: Schema = {
  title: "A form",
  description: "A form example with _(you can use markdown)_",
  type: "object",
  properties: {
    firstName: {
      type: "string",
      title: "First name",
      description: "Your first name",
      default: "Chuck",
    },
    age: {
      type: "integer",
      description: "**integer number**, please",
      title: "Age",
    },
    telephone: {
      type: "string",
      title: "Telephone",
    },
  },
};
const uiSchema: UiSchema = {};

const componentMeta: ComponentMeta<typeof FormBuilder> = {
  title: "Forms/Form builder",
  component: FormBuilder,
};

const schemaShape: yup.ObjectSchema = yup.object().shape({
  dynamicForm: yup.object(),
});
const initialValues = {
  dynamicForm: {
    schema,
    uiSchema,
  },
};

const FormBuilderTemplate: ComponentStory<typeof Formik> = (args) => (
  <Formik
    validationSchema={schemaShape}
    onSubmit={action("onSubmit")}
    {...args}
  >
    {({ handleSubmit }) => (
      <BootstrapForm noValidate onSubmit={handleSubmit}>
        <FormBuilder name="dynamicForm" />
        <Button type="submit">Submit</Button>
      </BootstrapForm>
    )}
  </Formik>
);

export const Default = FormBuilderTemplate.bind({});
Default.args = {
  initialValues,
};

export const MinimumInitialSchema = FormBuilderTemplate.bind({});
MinimumInitialSchema.args = {
  initialValues: {
    dynamicForm: {},
  },
};

export default componentMeta;
