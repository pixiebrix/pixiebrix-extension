/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import OutlineItem from "@/components/documentBuilder/outline/OutlineItem";
import { action } from "@storybook/addon-actions";
import {
  DragDropContext,
  Draggable,
  Droppable,
} from "react-beautiful-dnd-next";

export default {
  title: "DocumentOutline/OutlineItem",
  component: OutlineItem,
  parameters: {
    // The dnd library doesn't appear to be compatible with storyshots
    // Stories error with "Invariant failed: Drag handle could not obtain draggable ref"
    storyshots: false,
  },
} as ComponentMeta<typeof OutlineItem>;

const Template: ComponentStory<typeof OutlineItem> = (args) => (
  <div>
    <DragDropContext onDragEnd={action("onDragEnd")}>
      <Droppable droppableId="droppable">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            <Draggable draggableId="item" index={0}>
              {(provided) => (
                <OutlineItem
                  {...args}
                  provided={provided}
                  snapshot={{ isDragging: false, isDropAnimating: false }}
                />
              )}
            </Draggable>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  </div>
);

const element = {
  type: "row",
  config: {},
};

export const Expanded = Template.bind({});
Expanded.args = {
  item: {
    id: 0,
    children: [1],
    data: {
      elementName: "0",
      element,
    },
    isExpanded: true,
    hasChildren: true,
  },
  isActive: false,
  onExpand: action("expand"),
  onCollapse: action("collapse"),
  onSelect: action("select"),
};

export const Collapsed = Template.bind({});
Collapsed.args = {
  item: {
    id: 0,
    children: [1],
    data: {
      elementName: "0",
      element,
    },
    isExpanded: false,
    hasChildren: true,
  },
  isActive: false,
  onExpand: action("expand"),
  onCollapse: action("collapse"),
  onSelect: action("select"),
};

export const Active = Template.bind({});
Active.args = {
  item: {
    id: 0,
    children: [],
    data: {
      elementName: "0",
      element,
    },
    isExpanded: false,
    hasChildren: false,
  },
  isActive: true,
  onExpand: action("expand"),
  onCollapse: action("collapse"),
  onSelect: action("select"),
};
