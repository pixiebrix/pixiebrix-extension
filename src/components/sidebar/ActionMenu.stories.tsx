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
import ActionMenu from "@/components/sidebar/ActionMenu";
import { ComponentMeta, ComponentStory } from "@storybook/react";

export default {
  title: "Sidebar/ActionMenu",
  component: ActionMenu,
  argTypes: {
    onRemove: { action: "clicked remove" },
    onSave: { action: "clicked save" },
    onReset: { action: "clicked reset" },
    isDirty: {
      control: "boolean",
      defaultValue: false,
    },
    onAddToRecipe: { action: "clicked add to blueprint" },
    onRemoveFromRecipe: { action: "clicked remove from blueprint" },
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

export const NewExtension = Template.bind({});
NewExtension.args = {
  onReset: undefined,
  onRemoveFromRecipe: undefined,
  isDirty: true,
};

export const OldExtension = Template.bind({});
OldExtension.args = {
  onRemoveFromRecipe: undefined,
};

export const Blueprint = Template.bind({});
Blueprint.args = {
  onAddToRecipe: undefined,
  onRemoveFromRecipe: undefined,
};

export const NewExtensionInBlueprint = Template.bind({});
NewExtensionInBlueprint.args = {
  onSave: undefined,
  onReset: undefined,
  onAddToRecipe: undefined,
};

export const OldExtensionInBlueprint = Template.bind({});
OldExtensionInBlueprint.args = {
  onSave: undefined,
  onAddToRecipe: undefined,
};
