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
import RadioItemList from "@/components/radioItemList/RadioItemList";
import { action } from "@storybook/addon-actions";
import { Container } from "react-bootstrap";

const componentMeta: ComponentMeta<typeof RadioItemList> = {
  title: "Components/RadioItemList",
  component: RadioItemList,
};

const Story: ComponentStory<typeof RadioItemList> = (args) => (
  <Container>
    <RadioItemList {...args} />
  </Container>
);

export const Default = Story.bind({});
Default.args = {
  items: [
    {
      label: "Option 1",
      id: "1",
    },
    {
      label: "Option 2",
      id: "2",
    },
    {
      label: "Option 3",
      id: "3",
    },
  ],
  onSelectItem(item) {
    action("onSelectItem")(item);
  },
  defaultSelectedItemId: "2",
};

export const LongOptions = Story.bind({});
LongOptions.args = {
  items: [
    {
      label:
        "This is option 1. If you select option 1, then the action associated with option 1 will be taken by the system in accordance with your selection of option 1",
      id: "1",
    },
    {
      label:
        "This is option 2. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur sit amet nunc eros. Curabitur ornare leo non convallis scelerisque. Sed egestas sagittis scelerisque.",
      id: "2",
    },
    {
      label:
        "This is option 3. Integer facilisis id massa sit amet egestas. Sed vel ex vitae arcu blandit sagittis quis tristique sapien. Ut ut ornare arcu. Proin vel nisl ante. Fusce massa quam, condimentum eu feugiat sed, consectetur ac magna. Nulla pellentesque commodo consectetur. Curabitur venenatis aliquam neque, ut mattis lorem maximus nec. Nam ante nisl, porttitor eget vehicula a, luctus id sem. Nunc commodo leo sed augue tristique, id tincidunt elit maximus.",
      id: "3",
    },
  ],
  onSelectItem(item) {
    action("onSelectItem")(item);
  },
  defaultSelectedItemId: "2",
};

export default componentMeta;
