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

import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { Schema } from "@/core";
import FormBuilder from "./FormBuilder";
import { action } from "@storybook/addon-actions";
import { Formik } from "formik";
import * as yup from "yup";
import { Button, Form as BootstrapForm } from "react-bootstrap";

const schema: Schema = {
  title: "A form",
  description: "A form example.",
  type: "object",
  required: [],
  properties: {
    firstName: {
      type: "string",
      title: "First name",
      default: "Chuck",
    },
    lastName: {
      type: "string",
      title: "Last name",
    },
    telephone: {
      type: "string",
      title: "Telephone",
      minLength: 10,
    },
  },
};

const componentMeta: ComponentMeta<typeof FormBuilder> = {
  title: "Forms/Form builder",
  component: FormBuilder,
};

export const Default: ComponentStory<typeof FormBuilder> = (args) => (
  <FormBuilder {...args} />
);
Default.args = {
  schema,
  onChange: action("onChange"),
  onSave: action("onSave"),
  onPreviewSubmitted: action("ui form submitted"),
};

const SchemaShape: yup.ObjectSchema = yup.object().shape({
  dynamicForm: yup.object(),
});
const initialValues = {
  dynamicForm: schema,
};
export const FormikForm: ComponentStory<typeof FormBuilder> = () => (
  <Formik
    initialValues={initialValues}
    validationSchema={SchemaShape}
    onSubmit={action("onSubmit")}
  >
    {({ values, setFieldValue, handleSubmit }) => (
      <BootstrapForm noValidate onSubmit={handleSubmit}>
        <FormBuilder
          schema={values.dynamicForm}
          onChange={(schema) => {
            setFieldValue("dynamicForm", schema);
          }}
        />
        <Button type="submit">Submit</Button>
      </BootstrapForm>
    )}
  </Formik>
);

export default componentMeta;
