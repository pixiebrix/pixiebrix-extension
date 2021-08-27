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
import EllipsisMenu from "./EllipsisMenu";
import { action } from "@storybook/addon-actions";

export default {
  title: "Components/EllipsisMenu",
  component: EllipsisMenu,
} as ComponentMeta<typeof EllipsisMenu>;

const Template: ComponentStory<typeof EllipsisMenu> = (args) => (
  <EllipsisMenu {...args} />
);

export const Default = Template.bind({});
Default.args = {
  items: [
    {
      title: "Action",
      action: action("Action"),
    },
    {
      title: "Another ation",
      action: action("Another ation"),
    },
    {
      title: "Something dangerous",
      action: action("Something dangerous"),
      className: "text-danger",
    },
  ],
};
