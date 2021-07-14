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
import TextField from "./TextField";
import { noop } from "lodash";

export default {
  title: "Fields/TextField",
  component: TextField,
} as ComponentMeta<typeof TextField>;

const Template: ComponentStory<typeof TextField> = (args) => (
  <Formik initialValues={{ [args.name]: null }} onSubmit={noop}>
    <TextField {...args} />
  </Formik>
);

export const Normal = Template.bind({});
Normal.args = {
  name: "testField",
  label: "Enter some text",
  schema: {
    type: "string",
  },
};

export const Select = Template.bind({});
Select.args = {
  name: "testField",
  label: "Select an option",
  schema: {
    type: "string",
    enum: ["Foo", "Bar"],
  },
};

export const Examples = Template.bind({});
Examples.args = {
  name: "testField",
  label: "Select an option",
  schema: {
    type: "string",
    examples: ["Foo", "Bar"],
  },
};
