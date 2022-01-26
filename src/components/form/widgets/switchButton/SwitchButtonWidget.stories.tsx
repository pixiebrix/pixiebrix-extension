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
import SwitchButtonWidget from "./SwitchButtonWidget";

const componentMeta: ComponentMeta<typeof SwitchButtonWidget> = {
  title: "Fields/SwitchButtonWidget",
  component: SwitchButtonWidget,
  argTypes: {
    onChange: {
      action: "onChange",
      type: { name: "function", required: false },
    },
  },
};

const SwitchButtonTemplate: ComponentStory<typeof SwitchButtonWidget> = (
  args
) => <SwitchButtonWidget {...args} />;
export const Default = SwitchButtonTemplate.bind({});
Default.args = {
  name: "public",
};
export default componentMeta;
