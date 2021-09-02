import { ComponentMeta, ComponentStory } from "@storybook/react";
import Form from "@rjsf/core";
import React from "react";
import { Schema, UiSchema } from "./core";

const FormBuilderStory = () => {
  const formSchema: Schema = {
    title: "A registration form",
    description: "A simple form example.",
    type: "object",
    required: ["firstName", "lastName"],
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

  const uiSchema: UiSchema = {
    firstName: {
      "ui:autofocus": true,
      "ui:emptyValue": "",
      "ui:autocomplete": "family-name",
    },
    lastName: {
      "ui:emptyValue": "",
      "ui:autocomplete": "given-name",
    },
    age: {
      "ui:widget": "updown",
      "ui:title": "Age of person",
      "ui:description": "(earthian year)",
    },
    bio: {
      "ui:widget": "textarea",
    },
    password: {
      "ui:widget": "password",
      "ui:help": "Hint: Make it strong!",
    },
    date: {
      "ui:widget": "alt-datetime",
    },
    telephone: {
      "ui:options": {
        inputType: "tel",
      },
    },
  };
  return (
    <div>
      Form:
      <Form
        schema={formSchema}
        uiSchema={uiSchema}
        onSubmit={({ formData }) => {
          console.log("form submitted", formData);
        }}
      >
        <div>
          <button className="btn btn-primary" type="submit">
            Submit
          </button>
        </div>
      </Form>
    </div>
  );
};

export default {
  title: "Form builder",
  component: FormBuilderStory,
} as ComponentMeta<typeof FormBuilderStory>;

const Template: ComponentStory<typeof FormBuilderStory> = (args) => (
  <FormBuilderStory {...args} />
);

export const Default = Template.bind({});
