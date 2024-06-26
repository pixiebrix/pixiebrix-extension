/* eslint-disable jsx-a11y/interactive-supports-focus,jsx-a11y/click-events-have-key-events -- events from library */
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

import React, { useState } from "react";
import { type RenderItemParams } from "@atlaskit/tree";
import cx from "classnames";
import styles from "@/pageEditor/documentBuilder/outline/DocumentOutline.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faSquare,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import documentBuilderElementTypeLabels from "@/pageEditor/documentBuilder/elementTypeLabels";
import { type DocumentBuilderElement } from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { type TreeItem } from "@atlaskit/tree/types";
import { acceptDrop } from "@/pageEditor/documentBuilder/hooks/useMoveElement";
import { UnstyledButton } from "@/components/UnstyledButton";

export const LEVEL_PADDING_PX = 15;

const OutlineItem: React.FunctionComponent<
  RenderItemParams & {
    isActive: boolean;
    dragItem: TreeItem | null;
    onSelect: () => void;
    onDelete: () => void;
  }
> = ({
  depth,
  item,
  dragItem,
  onCollapse,
  onExpand,
  provided,
  isActive,
  onSelect,
  onDelete,
  snapshot,
}) => {
  const [hover, setHover] = useState(false);

  const { element: dragElement }: { element: DocumentBuilderElement } =
    dragItem?.data ?? {};
  const { element: itemElement }: { element: DocumentBuilderElement } =
    item.data ?? {};

  const allow = dragItem ? acceptDrop(dragElement, itemElement) : false;

  return (
    <div
      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props -- TODO: Add aria-selected where expected
      role="treeitem"
      style={{ paddingLeft: depth * LEVEL_PADDING_PX }}
      className={cx(styles.item, {
        [styles.activeItem ?? ""]: isActive,
        [styles.hover ?? ""]: hover && !isActive,
        [styles.allowDrop ?? ""]: allow,
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
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

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
          <span>{documentBuilderElementTypeLabels[itemElement.type]}</span>
        </div>
        {hover && (
          <div>
            <UnstyledButton
              tabIndex={-1}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDelete();
              }}
              className="text-danger"
            >
              <FontAwesomeIcon fixedWidth icon={faTrash} />
            </UnstyledButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutlineItem;
