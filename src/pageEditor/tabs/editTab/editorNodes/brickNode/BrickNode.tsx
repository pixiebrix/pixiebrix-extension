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
import BrickNodeContent from "@/pageEditor/tabs/editTab/editorNodes/brickNode/BrickNodeContent";
import styles from "./BrickNode.module.scss";
import MoveBrickControl from "@/pageEditor/tabs/editTab/editorNodes/brickNode/MoveBrickControl";
import cx from "classnames";
import { ListGroup } from "react-bootstrap";
import NodeActionsView from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import PipelineOffsetView from "@/pageEditor/tabs/editTab/editorNodes/PipelineOffsetView";
import TrailingMessage from "@/pageEditor/tabs/editTab/editorNodes/TrailingMessage";
import {
  BrickNodeProps,
  RunStatus,
} from "@/pageEditor/tabs/editTab/editTabTypes";

const BrickNode: React.VFC<BrickNodeProps> = ({
  onClick,
  active,
  parentIsActive,
  icon,
  runStatus,
  brickLabel,
  outputKey,
  nestingLevel,
  hasSubPipelines,
  collapsed,
  onClickMoveUp,
  onClickMoveDown,
  nodeActions,
  showBiggerActions,
  trailingMessage,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) {
      nodeRef.current?.focus();
    }
  }, [active]);

  return (
    <>
      <ListGroup.Item
        ref={nodeRef}
        as="div"
        onClick={onClick}
        active={active}
        className={cx(styles.root, "list-group-item-action", {
          [styles.expanded]: hasSubPipelines && !collapsed,
          [styles.parentIsActive]: parentIsActive,
        })}
        title={
          runStatus === RunStatus.SKIPPED
            ? "This brick was skipped due to its condition"
            : undefined
        }
        data-testid="editor-node"
      >
        <PipelineOffsetView nestingLevel={nestingLevel} active={active} />
        {hasSubPipelines && (
          <div className={styles.handleContainer}>
            <div
              className={cx({
                [styles.active]: active,
                [styles.closedHandle]: collapsed,
                [styles.openHandle]: !collapsed,
              })}
            />
          </div>
        )}
        <BrickNodeContent
          icon={icon}
          runStatus={runStatus}
          brickLabel={brickLabel}
          outputKey={outputKey}
        />
        <MoveBrickControl
          onClickMoveUp={onClickMoveUp}
          onClickMoveDown={onClickMoveDown}
        />
      </ListGroup.Item>
      <NodeActionsView
        nodeActions={nodeActions}
        showBiggerActions={showBiggerActions}
      />
      {trailingMessage && collapsed && (
        <TrailingMessage message={trailingMessage} />
      )}
    </>
  );
};

export default BrickNode;
