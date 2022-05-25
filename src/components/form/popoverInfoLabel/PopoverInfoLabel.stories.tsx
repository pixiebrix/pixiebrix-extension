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

import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";

export default {
  title: "Common/PopoverInfoLabel",
  component: PopoverInfoLabel,
  argTypes: {
    label: {
      type: "string",
    },
    description: {
      type: "string",
    },
  },
} as ComponentMeta<typeof PopoverInfoLabel>;

const Template: ComponentStory<typeof PopoverInfoLabel> = (args) => (
  <PopoverInfoLabel {...args} />
);

export const ShortDescription = Template.bind({});
ShortDescription.args = {
  label: "Label",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut.",
};

export const LongDescription = Template.bind({});
LongDescription.args = {
  label: "Label",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
};
