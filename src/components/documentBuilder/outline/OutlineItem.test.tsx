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

import { render } from "@testing-library/react";
import {
  DragDropContext,
  Draggable,
  Droppable,
} from "react-beautiful-dnd-next";
import { action } from "@storybook/addon-actions";
import OutlineItem from "@/components/documentBuilder/outline/OutlineItem";
import React from "react";

describe("OutlineItem", () => {
  test("smoke test", () => {
    const args = {
      depth: 0,
      item: {
        id: 0,
        children: [1],
        data: {
          elementName: "0",
          element: {
            type: "row",
            config: {},
          },
        },
        isExpanded: false,
        hasChildren: true,
      },
      isActive: false,
      onExpand: action("expand"),
      onCollapse: action("collapse"),
      onSelect: action("select"),
    };

    const element = render(
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
    );

    expect(element).toMatchSnapshot();
  });
});
