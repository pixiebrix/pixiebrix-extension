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
import ActionMenu from "@/pageEditor/sidebar/ActionMenu";
import { type ComponentMeta, type ComponentStory } from "@storybook/react";

export default {
  title: "Sidebar/ActionMenu",
  component: ActionMenu,
  argTypes: {
    isDirty: {
      control: "boolean",
      defaultValue: false,
    },
    disabled: {
      control: "boolean",
      defaultValue: false,
    },
  },
} as ComponentMeta<typeof ActionMenu>;

const Template: ComponentStory<typeof ActionMenu> = (args) => (
  <div className="d-flex">
    <ActionMenu {...args} />
  </div>
);

export const NewModComponent = Template.bind({});
NewModComponent.args = {
  onReset: undefined,
  onRemoveFromMod: undefined,
  isDirty: true,
};

export const OldModComponent = Template.bind({});
OldModComponent.args = {
  onRemoveFromMod: undefined,
};

export const Mod = Template.bind({});
Mod.args = {
  onAddToMod: undefined,
  onRemoveFromMod: undefined,
};

export const NewModComponentInMod = Template.bind({});
NewModComponentInMod.args = {
  onReset: undefined,
  onAddToMod: undefined,
};

export const OldModComponentInMod = Template.bind({});
OldModComponentInMod.args = {
  onAddToMod: undefined,
};
