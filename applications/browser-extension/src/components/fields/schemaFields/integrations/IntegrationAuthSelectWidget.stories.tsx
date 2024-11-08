/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { type ComponentMeta, type ComponentStory } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import IntegrationAuthSelectWidget from "./IntegrationAuthSelectWidget";
import { uuidv4, validateRegistryId } from "../../../../types/helpers";
import { type UUID } from "../../../../types/stringTypes";

export default {
  title: "Widgets/ServiceSelectWidget",
  component: IntegrationAuthSelectWidget,
} as ComponentMeta<typeof IntegrationAuthSelectWidget>;

const Template: ComponentStory<typeof IntegrationAuthSelectWidget> = ({
  options,
}) => (
  // FIXME: the refresh button in the story doesn't match the height of the input field b/c of the theme.
  //  In the Page Editor the height renders OK
  <IntegrationAuthSelectWidget
    name="service"
    value={"" as UUID}
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
      sharingType: "private",
    },
    {
      label: "Team Config",
      local: false,
      value: uuidv4(),
      serviceId: validateRegistryId("@story/service"),
      sharingType: "shared",
    },
  ],
};
