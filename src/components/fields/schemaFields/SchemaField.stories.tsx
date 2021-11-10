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
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { Form, Formik } from "formik";
import SchemaField from "./SchemaField";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { Button } from "react-bootstrap";

export default {
  title: "Fields/SchemaField",
  component: SchemaField,
} as ComponentMeta<typeof SchemaField>;

const Template: ComponentStory<
  React.FunctionComponent<SchemaFieldProps & { defaultValue: unknown }>
> = (args) => (
  <Formik
    initialValues={{
      myStr: "abc",

      topObj: {
        myNum: 2,
        parentObj: {
          [args.name]: args.defaultValue,
        },
      },
    }}
    onSubmit={(values) => {
      console.log("submit with form state:", values);
    }}
  >
    <Form>
      <SchemaField {...args} />
      <Button type="submit">Submit</Button>
    </Form>
  </Formik>
);

export const Boolean = Template.bind({});
Boolean.args = {
  name: "topObj.parentObj.testBoolean",
  defaultValue: false,
  label: "Switch this on or off",
  schema: {
    type: "boolean",
  },
};

export const NormalText = Template.bind({});
NormalText.args = {
  name: "testField",
  defaultValue: "",
  label: "Enter some text",
  schema: {
    type: "string",
  },
};

export const SelectText = Template.bind({});
SelectText.args = {
  name: "testField",
  label: "Select an option",
  defaultValue: null,
  schema: {
    type: "string",
    enum: ["Foo", "Bar"],
  },
};

export const ExampleText = Template.bind({});
ExampleText.args = {
  name: "testField",
  label: "Select an option",
  defaultValue: null,
  schema: {
    type: "string",
    examples: ["Foo", "Bar"],
  },
};
