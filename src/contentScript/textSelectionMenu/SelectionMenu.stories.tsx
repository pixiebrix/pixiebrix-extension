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

import type { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import SelectionMenu from "@/contentScript/textSelectionMenu/SelectionMenu";
import ActionRegistry from "@/contentScript/textSelectionMenu/ActionRegistry";
import { uuidv4 } from "@/types/helpers";
import { action } from "@storybook/addon-actions";

export default {
  title: "Enhancements/SelectionMenu",
  component: SelectionMenu,
} as ComponentMeta<typeof SelectionMenu>;

const Template: ComponentStory<typeof SelectionMenu> = (args) => (
  <SelectionMenu {...args} />
);

const emojiAction = {
  title: "😊 Emoji",
  handler() {
    action("😊");
  },
};

const textAction = {
  title: "No Emoji",
  handler() {
    action("No Emoji");
  },
};

const emojiRegistry = new ActionRegistry();
emojiRegistry.register(uuidv4(), emojiAction);
emojiRegistry.register(uuidv4(), emojiAction);

const mixedRegistry = new ActionRegistry();
mixedRegistry.register(uuidv4(), emojiAction);
mixedRegistry.register(uuidv4(), textAction);

export const EmojiButtons = Template.bind({});
EmojiButtons.args = {
  registry: emojiRegistry,
  onHide: action("onHide"),
};

export const MixedButtons = Template.bind({});
MixedButtons.args = {
  registry: mixedRegistry,
  onHide: action("onHide"),
};
