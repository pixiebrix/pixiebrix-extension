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
import Form, { OnSubmit } from "./Form";
import { action } from "@storybook/addon-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget, { Option } from "@/components/form/widgets/SelectWidget";

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

export const WithFormikHorizontalField: ComponentStory<typeof Form> = (
  args
) => (
  <Form validationSchema={SchemaShape} initialValues={initialValues} {...args}>
    <ConnectedFieldTemplate
      name="title"
      layout="horizontal"
      placeholder="Title"
    />
    <ConnectedFieldTemplate name="name" label="Name" description="A name" />
    <ConnectedFieldTemplate name="age" label="Age" description="Your age" />
  </Form>
);
WithFormikHorizontalField.storyName = "With Horizontal FormikField";

export const WithFormikVerticalField: ComponentStory<typeof Form> = (args) => (
  <Form validationSchema={SchemaShape} initialValues={initialValues} {...args}>
    <ConnectedFieldTemplate
      name="title"
      layout="vertical"
      placeholder="Title"
    />
    <ConnectedFieldTemplate
      name="name"
      layout="vertical"
      label="Name"
      description="A name"
    />
    <ConnectedFieldTemplate
      name="age"
      layout="vertical"
      label="Age"
      description="Your age"
    />
  </Form>
);
WithFormikVerticalField.storyName = "With Vertical FormikField";

export const CustomSubmit: ComponentStory<typeof Form> = (args) => (
  <Form
    validationSchema={SchemaShape}
    initialValues={initialValues}
    {...args}
    renderSubmit={() => <button type="submit">Click to submit</button>}
  >
    <ConnectedFieldTemplate
      name="title"
      layout="horizontal"
      placeholder="Title"
    />
    <ConnectedFieldTemplate name="name" label="Name" description="A name" />
    <ConnectedFieldTemplate name="age" label="Age" description="Your age" />
  </Form>
);

const AllFieldsSchema: yup.ObjectSchema = yup.object().shape({
  name: yup.string().required(),
  story: yup.string(),
  select: yup.string(),
  public: yup.boolean(),
});
const allFieldsInitialValues = {
  name: "",
  story: "",
  public: false,
};
const selectOptions: Option[] = [
  {
    label: "Option 1",
    value: 1,
  },
  {
    label: "Option 2",
    value: 2,
  },
  {
    label: "Option 3",
    value: 3,
  },
];
export const AllFields: ComponentStory<typeof Form> = (args) => (
  <Form
    validationSchema={AllFieldsSchema}
    initialValues={allFieldsInitialValues}
    {...args}
  >
    <ConnectedFieldTemplate
      name="name"
      layout="horizontal"
      label="Name"
      description="A name"
    />
    <ConnectedFieldTemplate
      name="story"
      layout="horizontal"
      label="Story"
      as="textarea"
      description="Tell me your story"
      rows={10}
    />
    <ConnectedFieldTemplate
      name="select"
      layout="horizontal"
      label="Select"
      description="Demonstration dropdown"
      as={SelectWidget}
      blankValue={null}
      options={selectOptions}
    />
    <ConnectedFieldTemplate
      name="public"
      layout="switch"
      label={
        <span>
          <FontAwesomeIcon icon={faGlobe} /> This is a boolean field
        </span>
      }
    />
  </Form>
);

export default componentMeta;
