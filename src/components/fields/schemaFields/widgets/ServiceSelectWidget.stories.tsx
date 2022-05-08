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
import { ComponentMeta, ComponentStory } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import ServiceSelectWidget from "@/components/fields/schemaFields/widgets/ServiceSelectWidget";
import { uuidv4, validateRegistryId } from "@/types/helpers";

export default {
  title: "Widgets/ServiceSelectWidget",
  component: ServiceSelectWidget,
} as ComponentMeta<typeof ServiceSelectWidget>;

const Template: ComponentStory<typeof ServiceSelectWidget> = ({ options }) => (
  // FIXME: the refresh button in the story doesn't match the height of the input field b/c of the theme.
  //  In the Page Editor the height renders OK
  <ServiceSelectWidget
    name="service"
    value={null}
    onChange={action("onChange")}
    options={options}
    refreshOptions={action("refreshOptions")}
  />
);

export const Empty = Template.bind({});
Empty.args = {
  options: [],
};

export const SelectedOption = Template.bind({});
SelectedOption.args = {
  options: [
    {
      label: "Local Config",
      local: true,
      value: uuidv4(),
      serviceId: validateRegistryId("@story/service"),
    },
    {
      label: "Team Config",
      local: false,
      value: uuidv4(),
      serviceId: validateRegistryId("@story/service"),
    },
  ],
};
