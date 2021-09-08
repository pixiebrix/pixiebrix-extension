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
import * as yup from "yup";
import { ComponentMeta, ComponentStory } from "@storybook/react";
import { Form as BootstrapForm } from "react-bootstrap";
import HorizontalFormGroup from "../fields/HorizontalFormGroup";
import Form, { OnSubmit } from "./Form";
import FormikHorizontalTextField from "./fields/FormikHorizontalTextField";
import FormikSwitchButton from "./fields/FormikSwitchButton";
import { action } from "@storybook/addon-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";

const componentMeta: ComponentMeta<typeof Form> = {
  title: "Forms/Formik",
  component: Form,
  argTypes: {
    onSubmit: ((values, helpers) => {
      action("onSubmit")(values);
      helpers.setSubmitting(false);
    }) as OnSubmit,
    validateOnMount: {
      options: [true, false],
    },
  },
};

const SchemaShape: yup.ObjectSchema = yup.object().shape({
  title: yup.string().optional().oneOf(["Mr.", "Ms.", "Mrs.", "other"]),
  name: yup.string().required(),
  age: yup.number().required("What's your age again?").positive().integer(),
});

const initialValues = {
  title: "",
  name: "",
  age: "",
};

export const WithHorizontalFormGroup: ComponentStory<typeof Form> = (args) => (
  <Form validationSchema={SchemaShape} initialValues={initialValues} {...args}>
    <HorizontalFormGroup label="Title" propsOrFieldName="title">
      {(field, meta) => (
        <BootstrapForm.Control {...field} isInvalid={Boolean(meta.error)} />
      )}
    </HorizontalFormGroup>
    <HorizontalFormGroup
      label="Name"
      propsOrFieldName="name"
      description="A name"
    >
      {(field, meta) => (
        <BootstrapForm.Control {...field} isInvalid={Boolean(meta.error)} />
      )}
    </HorizontalFormGroup>
    <HorizontalFormGroup
      label="Age"
      propsOrFieldName="age"
      description="Your age"
    >
      {(field, meta) => (
        <BootstrapForm.Control {...field} isInvalid={Boolean(meta.error)} />
      )}
    </HorizontalFormGroup>
  </Form>
);
WithHorizontalFormGroup.storyName = "With HorizontalFormGroup";

export const WithHorizontalTextField: ComponentStory<typeof Form> = (args) => (
  <Form validationSchema={SchemaShape} initialValues={initialValues} {...args}>
    <FormikHorizontalTextField placeholder="Title" name="title" />
    <FormikHorizontalTextField label="Name" name="name" description="A name" />
    <FormikHorizontalTextField label="Age" name="age" description="Your age" />
  </Form>
);
WithHorizontalTextField.storyName = "With HorizontalTextField";

export const CustomSubmit: ComponentStory<typeof Form> = (args) => (
  <Form
    validationSchema={SchemaShape}
    initialValues={initialValues}
    {...args}
    renderSubmit={() => <button type="submit">Click to submit</button>}
  >
    <FormikHorizontalTextField placeholder="Title" name="title" />
    <FormikHorizontalTextField label="Name" name="name" description="A name" />
    <FormikHorizontalTextField label="Age" name="age" description="Your age" />
  </Form>
);

const AllFieldsSchema: yup.ObjectSchema = yup.object().shape({
  name: yup.string().required(),
  public: yup.boolean(),
});
const allFieldsnitialValues = {
  name: "",
  public: false,
};
export const AllFields: ComponentStory<typeof Form> = (args) => (
  <Form
    validationSchema={AllFieldsSchema}
    initialValues={allFieldsnitialValues}
    {...args}
  >
    <FormikHorizontalTextField label="Name" name="name" description="A name" />
    <FormikSwitchButton
      label={
        <span>
          <FontAwesomeIcon icon={faGlobe} /> Public
        </span>
      }
      name="public"
    />
  </Form>
);

export default componentMeta;
