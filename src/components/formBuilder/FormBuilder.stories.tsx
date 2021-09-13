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

const Template: ComponentStory<typeof FormBuilder> = (args) => (
  <FormBuilder {...args} />
);

export const Default = Template.bind({});
Default.args = {
  schema,
  onChange: action("onChange"),
  onSave: action("onSave"),
  onPreviewSubmitted: action("ui form submitted"),
};

export default componentMeta;
