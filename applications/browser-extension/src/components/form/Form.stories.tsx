/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { type ComponentMeta, type ComponentStory } from "@storybook/react";
import Form, { type OnSubmit } from "./Form";
import { action } from "@storybook/addon-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import ConnectedFieldTemplate from "./ConnectedFieldTemplate";
import SelectWidget, {
  type Option,
} from "./widgets/SelectWidget";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form as BootstrapForm } from "react-bootstrap";
import { type CustomFieldWidget } from "./FieldTemplate";
import createMenuListWithAddButton from "./widgets/createMenuListWithAddButton";
import { range } from "lodash";
import SwitchButtonWidget from "./widgets/switchButton/SwitchButtonWidget";
import { Provider } from "react-redux";
import { editorStore } from "../../testUtils/storyUtils";

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

const SchemaShape = yup.object().shape({
  title: yup.string().optional().oneOf(["Mr.", "Ms.", "Mrs.", "other"]),
  name: yup.string().required(),
  age: yup
    .number()
    .required(
      "What's your age again? [Age calculator](https://www.calculator.net/age-calculator.html)",
    )
    .positive()
    .integer(),
});

const initialValues = {
  title: "",
  name: "",
  age: "",
};

export const WithFormikField: ComponentStory<typeof Form> = (args) => (
  <Provider store={editorStore()}>
    <Form
      validationSchema={SchemaShape}
      {...args}
      initialValues={initialValues}
    >
      <ConnectedFieldTemplate name="title" placeholder="Title" />
      <ConnectedFieldTemplate
        name="name"
        placeholder="Title"
        label="Name"
        description="A name"
      />
      <ConnectedFieldTemplate name="age" label="Age" description="Your age" />
    </Form>
  </Provider>
);
WithFormikField.storyName = "With FormikField";

export const CustomSubmit: ComponentStory<typeof Form> = (args) => (
  <Provider store={editorStore()}>
    <Form
      validationSchema={SchemaShape}
      {...args}
      initialValues={initialValues}
      renderSubmit={() => <button type="submit">Click to submit</button>}
    >
      <ConnectedFieldTemplate name="title" placeholder="Title" />
      <ConnectedFieldTemplate name="name" label="Name" description="A name" />
      <ConnectedFieldTemplate name="age" label="Age" description="Your age" />
    </Form>
  </Provider>
);

const AllFieldsSchema = yup.object().shape({
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
const selectOptions: Array<Option<number>> = range(1, 16).map((x: number) => ({
  label: `Option ${x}`,
  value: x,
}));

const BootstrapFormControlWidget: CustomFieldWidget = ({ value, ...props }) => (
  <div style={{ border: "1px solid black" }}>
    <BootstrapForm.Control
      type="password"
      {...props}
      value={value ?? undefined}
    />
  </div>
);

export const AllFields: ComponentStory<typeof Form> = (args) => (
  <Provider store={editorStore()}>
    <Form
      validationSchema={AllFieldsSchema}
      {...args}
      initialValues={allFieldsInitialValues}
    >
      <ConnectedFieldTemplate name="name" label="Name" description="A name" />
      <ConnectedFieldTemplate
        name="story"
        label="Story"
        as="textarea"
        description="Tell me your story"
        rows={10}
      />
      <ConnectedFieldTemplate
        name="select"
        label="Select"
        description="Demonstration dropdown"
        as={SelectWidget}
        blankValue={null}
        options={selectOptions}
      />
      <ConnectedFieldTemplate
        name="select-add-new"
        label="Select with Add New"
        description="Creatable"
        as={SelectWidget}
        blankValue={null}
        options={selectOptions}
        components={{
          MenuList: createMenuListWithAddButton(action("onAddNew clicked")),
        }}
      />
      <ConnectedFieldTemplate
        name="public"
        as={SwitchButtonWidget}
        label={
          <span>
            <FontAwesomeIcon icon={faGlobe} /> This is a boolean field
          </span>
        }
      />
      <ConnectedFieldTemplate
        name="bsCustomFormControl"
        label="BS Form Control as Custom Widget"
        as={BootstrapFormControlWidget}
        description="You can use a FormControl as a wrapped Widget"
      />

      <ConnectedFieldTemplate
        fitLabelWidth
        name="name"
        label="Name"
        description="Field with fitLabelWidth"
      />
    </Form>
  </Provider>
);

export default componentMeta;
