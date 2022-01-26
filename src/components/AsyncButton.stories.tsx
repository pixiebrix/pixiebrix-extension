/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import AsyncButton from "@/components/AsyncButton";

export default {
  title: "Common/AsyncButton",
  component: AsyncButton,
  argTypes: {
    onClick: { action: "clicked" },
    variant: {
      options: ["primary", "secondary", "info", "warning", "danger"],
      control: {
        type: "select",
      },
    },
    size: {
      options: ["lg", "md", "sm"],
      control: {
        type: "select",
      },
    },
  },
} as ComponentMeta<typeof AsyncButton>;

const Template: ComponentStory<typeof AsyncButton> = (args) => (
  <AsyncButton {...args} />
);

export const Primary = Template.bind({});
Primary.args = {
  variant: "primary",
  size: "lg",
  children: "Primary",
};

export const Info = Template.bind({});
Info.args = {
  variant: "info",
  size: "lg",
  children: "Info",
};
