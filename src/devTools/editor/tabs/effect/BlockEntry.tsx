/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { IBlock } from "@/core";
import { ListGroup } from "react-bootstrap";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical, faTimes } from "@fortawesome/free-solid-svg-icons";
import { Draggable } from "react-beautiful-dnd";

const BlockEntry: React.FunctionComponent<{
  block: IBlock;
  index: number;
  outputKey: string;
  onSelect: () => void;
  onRemove?: () => void;
  isDragDisabled: boolean;
  showDragHandle?: boolean;
  isActive: boolean;
}> = ({
  block,
  index,
  outputKey,
  isDragDisabled,
  showDragHandle = true,
  isActive,
  onSelect,
  onRemove,
}) => {
  if (!block) {
    // There's a race when a new block is saved
    return (
      <ListGroup.Item
        className={cx("ReaderList__item", { dragDisabled: isDragDisabled })}
      >
        <div className="d-flex">
          <div>
            <FontAwesomeIcon icon={faGripVertical} />
          </div>
          <div className="ReaderList__label">
            <div>Block</div>
          </div>
        </div>
      </ListGroup.Item>
    );
  }

  return (
    <Draggable
      index={index}
      isDragDisabled={isDragDisabled}
      draggableId={block.id}
    >
      {(provided) => (
        <ListGroup.Item
          key={`${index}-${block.id}`}
          onClick={onSelect}
          active={isActive}
          ref={provided.innerRef}
          className={cx("ReaderList__item", { dragDisabled: isDragDisabled })}
          {...provided.draggableProps}
        >
          <div className="d-flex">
            {showDragHandle && (
              <div {...provided.dragHandleProps}>
                <FontAwesomeIcon icon={faGripVertical} />
              </div>
            )}
            <div className="ReaderList__label">
              <div>{block.name}</div>
              {outputKey && (
                <div>
                  <code>@{outputKey}</code>
                </div>
              )}
            </div>
            {onRemove && (
              <div className="ReaderList__actions">
                <span role="button" onClick={onRemove} className="text-danger">
                  <FontAwesomeIcon icon={faTimes} />
                </span>
              </div>
            )}
          </div>
        </ListGroup.Item>
      )}
    </Draggable>
  );
};

export default BlockEntry;
