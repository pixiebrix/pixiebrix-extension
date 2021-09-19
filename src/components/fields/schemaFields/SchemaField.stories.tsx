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
import { Formik } from "formik";
import { noop } from "lodash";
import SchemaField from "./SchemaField";

export default {
  title: "Fields/SchemaField",
  component: SchemaField,
} as ComponentMeta<typeof SchemaField>;

const Template: ComponentStory<typeof SchemaField> = (args) => (
  <Formik initialValues={{ [args.name]: null }} onSubmit={noop}>
    <SchemaField {...args} />
  </Formik>
);

export const NormalText = Template.bind({});
NormalText.args = {
  name: "testField",
  label: "Enter some text",
  schema: {
    type: "string",
  },
};

export const SelectText = Template.bind({});
SelectText.args = {
  name: "testField",
  label: "Select an option",
  schema: {
    type: "string",
    enum: ["Foo", "Bar"],
  },
};

export const ExampleText = Template.bind({});
ExampleText.args = {
  name: "testField",
  label: "Select an option",
  schema: {
    type: "string",
    examples: ["Foo", "Bar"],
  },
};
