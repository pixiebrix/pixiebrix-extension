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

import React, { useState } from "react";
import { RenderItemParams } from "@atlaskit/tree";
import cx from "classnames";
import styles from "@/components/documentBuilder/outline/DocumentOutline.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faSquare,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

export const LEVEL_PADDING_PX = 10;

const OutlineItem: React.FunctionComponent<
  RenderItemParams & {
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
  }
> = ({
  depth,
  item,
  onCollapse,
  onExpand,
  provided,
  isActive,
  onSelect,
  onDelete,
  snapshot,
}) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{ paddingLeft: depth * LEVEL_PADDING_PX }}
      className={cx(styles.item, {
        [styles.activeItem]: isActive,
      })}
      onClick={() => {
        onSelect();
      }}
      onMouseEnter={() => {
        if (!snapshot.isDragging && !snapshot.isDropAnimating) {
          setHover(true);
        }
      }}
      onMouseLeave={() => {
        setHover(false);
      }}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
    >
      <div className="d-flex">
        <div>
          {item.hasChildren ? (
            <FontAwesomeIcon
              role="button"
              fixedWidth
              onClick={() => {
                if (item.isExpanded) {
                  onCollapse(item.id);
                } else {
                  onExpand(item.id);
                }
              }}
              icon={item.isExpanded ? faCaretDown : faCaretRight}
            />
          ) : (
            <FontAwesomeIcon fixedWidth icon={faSquare} />
          )}
        </div>
        <div className="flex-grow-1">
          <span>{item.data.element.type}</span>
        </div>
        {hover && (
          <div>
            <span
              role="button"
              onClick={() => {
                onDelete();
              }}
              className="text-danger"
            >
              <FontAwesomeIcon fixedWidth icon={faTrash} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutlineItem;
