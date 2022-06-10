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
import { RenderItemParams } from "@atlaskit/tree";
import cx from "classnames";
import styles from "@/components/documentBuilder/outline/DocumentOutline.module.scss";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";

export const LEVEL_PADDING_PX = 10;

const OutlineItem: React.FunctionComponent<
  RenderItemParams & {
    isActive: boolean;
    onSelect: () => void;
  }
> = ({ depth, item, onCollapse, onExpand, provided, isActive, onSelect }) => (
  <div
    style={{ paddingLeft: depth * LEVEL_PADDING_PX }}
    className={cx(styles.item, {
      [styles.activeItem]: isActive,
    })}
    onClick={() => {
      onSelect();
    }}
    ref={provided.innerRef}
    {...provided.draggableProps}
    {...provided.dragHandleProps}
  >
    {item.hasChildren && (
      <Button
        variant="light"
        size="sm"
        onClick={() => {
          if (item.isExpanded) {
            onCollapse(item.id);
          } else {
            onExpand(item.id);
          }
        }}
      >
        <FontAwesomeIcon
          fixedWidth
          icon={item.isExpanded ? faCaretDown : faCaretRight}
        />
      </Button>
    )}

    <span>{item.data.element.type}</span>
  </div>
);

export default OutlineItem;
