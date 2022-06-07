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

import React, { useEffect, useRef } from "react";
import styles from "./EditorNode.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ListGroup } from "react-bootstrap";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import { RegistryId, UUID } from "@/core";
import EditorNodeContent, {
  EditorNodeContentProps,
  RunStatus,
} from "./EditorNodeContent";
import { isEmpty } from "lodash";

export type NodeId = UUID;
export type EditorNodeProps = EditorNodeContentProps & {
  nodeId?: NodeId;
  blockId?: RegistryId;
  onClick?: () => void;
  active?: boolean;
  canMoveAnything?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onClickMoveUp?: () => void;
  onClickMoveDown?: () => void;
  children?: Array<{
    label: string;
    pipelinePath: string;
    nodes: EditorNodeProps[];
  }>;
  collapsed?: boolean;
};

const EditorNode: React.FC<EditorNodeProps> = ({
  blockId,
  onClick,
  active,
  canMoveUp,
  canMoveDown,
  onClickMoveUp,
  onClickMoveDown,
  children,
  collapsed,
  ...contentProps
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("render EditorNode", { blockId, canMoveUp, canMoveDown });
  }, [blockId, canMoveDown, canMoveUp]);

  useEffect(() => {
    if (active) {
      nodeRef.current?.focus();
    }
  }, [active]);

  return (
    <ListGroup.Item
      ref={nodeRef}
      as="div"
      onClick={onClick}
      active={active}
      className={cx(styles.root, "list-group-item-action")}
      title={
        contentProps.runStatus === RunStatus.SKIPPED
          ? "This brick was skipped due to its condition"
          : undefined
      }
      data-testid="editor-node"
    >
      {!isEmpty(children) && (
        <div
          className={cx({
            [styles.active]: active,
            [styles.closedHandle]: collapsed,
            [styles.openHandle]: !collapsed,
          })}
        />
      )}
      <EditorNodeContent {...contentProps} />
      {(canMoveUp || canMoveDown) && (
        <div className={styles.moveButtons}>
          <button
            type="button"
            onClick={(event) => {
              onClickMoveUp();
              event.stopPropagation();
            }}
            title="Move brick higher"
            disabled={!canMoveUp}
            className={styles.moveButton}
          >
            <FontAwesomeIcon icon={faArrowUp} size="sm" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              onClickMoveDown();
              event.stopPropagation();
            }}
            title="Move brick lower"
            disabled={!canMoveDown}
            className={styles.moveButton}
          >
            <FontAwesomeIcon icon={faArrowDown} size="sm" />
          </button>
        </div>
      )}
    </ListGroup.Item>
  );
};

export default EditorNode;
