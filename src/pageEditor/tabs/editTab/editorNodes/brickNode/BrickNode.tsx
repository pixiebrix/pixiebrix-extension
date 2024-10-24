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

import React, { type RefObject, useLayoutEffect, useRef } from "react";
import useAutoFocusConfiguration from "@/hooks/useAutoFocusConfiguration";
import BrickNodeContent from "@/pageEditor/tabs/editTab/editorNodes/brickNode/BrickNodeContent";
import styles from "./BrickNode.module.scss";
import MoveBrickControl from "@/pageEditor/tabs/editTab/editorNodes/brickNode/MoveBrickControl";
import cx from "classnames";
import { ListGroup } from "react-bootstrap";
import NodeActionsView from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import PipelineOffsetView from "@/pageEditor/tabs/editTab/editorNodes/PipelineOffsetView";
import TrailingMessage from "@/pageEditor/tabs/editTab/editorNodes/TrailingMessage";
import {
  type BrickNodeProps,
  RunStatus,
} from "@/pageEditor/tabs/editTab/editTabTypes";
import { useSelector } from "react-redux";
import { selectActiveBuilderPreviewElement } from "@/pageEditor/store/editor/editorSelectors";

function useScrollIntoViewEffect({
  nodeRef,
  active = false,
  isSubPipelineHeaderActive = false,
}: {
  nodeRef: RefObject<HTMLDivElement>;
  active: boolean | undefined;
  isSubPipelineHeaderActive: boolean | undefined;
}) {
  const isInitialRenderRef = useRef<boolean>(true);

  const activeBuilderPreviewElementId = useSelector(
    selectActiveBuilderPreviewElement,
  );

  // Scroll into view when the Formik form re-mounted, e.g., brick move/deletion/copy-paste/etc.
  useLayoutEffect(() => {
    if (active && isInitialRenderRef.current) {
      isInitialRenderRef.current = false;

      // :shrug: requestAnimationFrame seems to be necessary even when using useLayoutEffect to ensure the scroll works
      // That might be due to loading states in usePipelineNodes
      // XXX: there's a slight flicker due to scroll position when the Formik form is remounted. In the future, we could
      // attempt to pass a ref to the containing scroll container to set the scroll before the first paint
      // XXX: there's also a quirky behavior/buggy behavior when moving a brick that's not selected and the selected
      // brick is not in view. The scroll will reset to the position of the select brick
      const timeout = requestAnimationFrame(() => {
        nodeRef.current?.scrollIntoView({
          block: "center",
          // Scroll instantly to simulate maintaining scroll position across Formik remounts
          behavior: "instant",
        });
      });

      return () => {
        cancelAnimationFrame(timeout);
      };
    }

    isInitialRenderRef.current = false;
  }, [isInitialRenderRef, nodeRef, active]);

  // Automatically scroll to node corresponding to element selected in the Document Builder
  useLayoutEffect(() => {
    if (active && !isSubPipelineHeaderActive && activeBuilderPreviewElementId) {
      nodeRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [
    nodeRef,
    activeBuilderPreviewElementId,
    isSubPipelineHeaderActive,
    active,
  ]);

  return nodeRef;
}

const BrickNode: React.VFC<BrickNodeProps> = ({
  onClick,
  active,
  isParentActive,
  onHoverChange,
  icon,
  runStatus,
  brickLabel,
  brickSummary,
  outputKey,
  nestingLevel,
  hasSubPipelines,
  collapsed,
  onClickMoveUp,
  onClickMoveDown,
  nodeActions,
  showBiggerActions,
  trailingMessage,
  isSubPipelineHeaderActive,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useScrollIntoViewEffect({ nodeRef, active, isSubPipelineHeaderActive });

  useAutoFocusConfiguration({ elementRef: nodeRef, focus: active });

  return (
    <>
      <ListGroup.Item
        ref={nodeRef}
        as="div"
        onClick={onClick}
        active={active}
        className={cx(styles.root, "list-group-item-action", {
          [styles.expanded ?? ""]: hasSubPipelines && !collapsed,
          [styles.parentIsActive ?? ""]: isParentActive,
        })}
        title={
          runStatus === RunStatus.SKIPPED
            ? "This brick was skipped due to its condition"
            : undefined
        }
        data-testid="editor-node"
        onMouseOver={() => {
          onHoverChange(true);
        }}
        onMouseOut={() => {
          onHoverChange(false);
        }}
      >
        <PipelineOffsetView nestingLevel={nestingLevel} active={active} />
        {hasSubPipelines && (
          <div className={styles.handleContainer}>
            <div
              className={cx({
                [styles.active ?? ""]: active,
                [styles.closedHandle ?? ""]: collapsed,
                [styles.openHandle ?? ""]: !collapsed,
                [styles.noOutputKey ?? ""]: !outputKey,
              })}
            />
          </div>
        )}
        <BrickNodeContent
          icon={icon}
          runStatus={runStatus}
          brickLabel={brickLabel}
          brickSummary={brickSummary}
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
