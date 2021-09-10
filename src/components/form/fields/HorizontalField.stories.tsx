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
import { ComponentMeta, ComponentStory } from "@storybook/react";
import HorizontalField from "./HorizontalField";

const componentMeta: ComponentMeta<typeof HorizontalField> = {
  title: "Fields/HorizontalField",
  component: HorizontalField,
  argTypes: {
    onChange: {
      action: "onChange",
      type: { name: "function", required: false },
    },
    onFocus: {
      action: "onFocus",
      type: { name: "function", required: false },
    },
    onBlur: {
      action: "onBlur",
      type: { name: "function", required: false },
    },
    onClick: {
      action: "onClick",
      type: { name: "function", required: false },
    },
    description: {
      control: {
        type: "text",
      },
    },
    type: {
      type: { name: "string", required: true },
      options: [
        "button",
        "checkbox",
        "color",
        "date",
        "datetime-local",
        "email",
        "file",
        "hidden",
        "image",
        "month",
        "number",
        "password",
        "radio",
        "range",
        "reset",
        "search",
        "submit",
        "tel",
        "text",
        "time",
        "url",
        "week",
        "textarea",
      ],
      control: { type: "select" },
    },
    widget: {
      type: { name: "function", required: false },
    },
  },
};

const HorizontalFieldTemplate: ComponentStory<typeof HorizontalField> = (
  args
) => <HorizontalField {...args} />;
export const Default = HorizontalFieldTemplate.bind({});
Default.args = {
  name: "textField",
  label: "Text Field",
  type: "text",
};

export const CustomWidget = HorizontalFieldTemplate.bind({});
CustomWidget.args = {
  name: "textField",
  label: "Text Field",
  widget: ({ value, onChange }) => (
    <input value={value} onChange={onChange} data-custom="plain html input" />
  ),
};

export default componentMeta;
