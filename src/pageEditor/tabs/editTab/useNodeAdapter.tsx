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

import React, { useCallback, useState } from "react";
import EditorNode, {
  NodeId,
} from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { ListGroup } from "react-bootstrap";
import styles from "./NodeAdapter.module.scss";
import BrickModal from "@/components/brickModal/BrickModal";
import TooltipIconButton from "@/components/TooltipIconButton";
import {
  faPaste,
  faPlus,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveNodeId } from "@/pageEditor/slices/editorSelectors";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import EditorNodeLayout from "./editorNodeLayout/EditorNodeLayout";
import { isEmpty, join } from "lodash";
import { actions } from "@/pageEditor/slices/editorSlice";
import {
  InnerRenderProps,
  NodeAdapterProps,
  RenderProps,
} from "@/pageEditor/tabs/editTab/nodeAdapterTypes";

const addBrickCaption = (
  <span>
    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add brick
  </span>
);

export function useNodeAdapter({
  addBlock,
  moveBlockUp,
  moveBlockDown,
  pasteBlock,
  relevantBlocksToAdd,
  allBlocks,
}: NodeAdapterProps): (renderProps: RenderProps) => React.ReactNode {
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const activeNodeId = useSelector(selectActiveNodeId);

  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(
    {}
  );

  const dispatch = useDispatch();
  const setActiveNodeId = useCallback(
    (nodeId: NodeId) => {
      dispatch(actions.setElementActiveNodeId(nodeId));
    },
    [dispatch]
  );

  const renderNode = useCallback(
    ({
      pipelinePath,
      nodeProps,
      nodeIndex,
      lastIndex,
      showAppend,
    }: InnerRenderProps) => {
      const { nodeId, children } = nodeProps;
      const isRootPipeline = isEmpty(pipelinePath);
      const nodeIsActive = nodeId === activeNodeId;

      nodeProps.active = nodeIsActive;
      // TODO: Handle collapsed state during add/remove/move node actions
      const collapsedKey = join([pipelinePath, nodeIndex], ".");
      /* eslint-disable security/detect-object-injection -- working with a record */
      const collapsed = collapsedState[collapsedKey];
      nodeProps.collapsed = collapsed;
      nodeProps.onClick = () => {
        if (nodeId === activeNodeId) {
          setCollapsedState((previousState) => ({
            ...previousState,
            [collapsedKey]: !collapsed,
          }));
        } else {
          setActiveNodeId(nodeId);
        }
      };
      /* eslint-enable security/detect-object-injection */

      // Editor nodes are displayed from top to bottom in array order,
      // so, "up" is lower in the array, and "down" is higher in the array.
      // Also, you cannot move the foundation node, which is always at
      // index 0.
      if (isRootPipeline) {
        if (nodeId !== FOUNDATION_NODE_ID) {
          nodeProps.canMoveUp = nodeIndex > 1; // Any nodes beyond the first non-foundation node
          nodeProps.canMoveDown = nodeIndex > 0 && nodeIndex < lastIndex; // Not the first and not the last
          nodeProps.onClickMoveUp = () => {
            moveBlockUp(nodeId);
          };

          nodeProps.onClickMoveDown = () => {
            moveBlockDown(nodeId);
          };
        }
      } else {
        nodeProps.canMoveUp = nodeIndex > 0;
        nodeProps.canMoveDown = nodeIndex < lastIndex;
        nodeProps.onClickMoveUp = () => {
          moveBlockUp(nodeId);
        };

        nodeProps.onClickMoveDown = () => {
          moveBlockDown(nodeId);
        };
      }

      const showAddBlock =
        isApiAtLeastV2 && (nodeIndex < lastIndex || showAppend);
      const showBiggerActionButtons = nodeIndex === lastIndex && isRootPipeline;
      const showAddMessage = showAddBlock && showBiggerActionButtons;
      const showPaste = pasteBlock && isApiAtLeastV2;

      return (
        <React.Fragment key={nodeId}>
          {!isRootPipeline && (
            <div
              className={cx(styles.pipeLine, { [styles.active]: nodeIsActive })}
            />
          )}
          <EditorNode
            {...nodeProps}
            className={cx({ [styles.subPipelineNode]: !isRootPipeline })}
          />
          {children?.length > 0 &&
            !collapsed &&
            children.map(
              ({ label, pipelinePath: subPipelinePath, nodes: childNodes }) => (
                <>
                  <div
                    className={cx(styles.subPipelineHeader, {
                      [styles.pipelineBottom]: isEmpty(childNodes),
                    })}
                  >
                    <div className={styles.headerPipeLineTop} />
                    <div className={styles.subPipelineLabel}>{label}</div>
                    <div className={styles.headerPipeLineBottom} />
                    <div
                      className={cx(styles.actions, styles.topPipelineActions)}
                    >
                      <BrickModal
                        bricks={relevantBlocksToAdd}
                        renderButton={(onClick) => (
                          <TooltipIconButton
                            name={`add-node-${nodeIndex}`}
                            icon={faPlusCircle}
                            onClick={onClick}
                            tooltipText="Add a brick"
                          />
                        )}
                        selectCaption={addBrickCaption}
                        onSelect={(block) => {
                          addBlock(block, subPipelinePath, 0);
                        }}
                      />
                    </div>
                  </div>
                  <ListGroup.Item
                    key={label}
                    as="div"
                    className={styles.subPipeline}
                  >
                    <EditorNodeLayout
                      nodes={childNodes}
                      renderNode={(renderProps) =>
                        renderNode({
                          ...renderProps,
                          pipelinePath: subPipelinePath,
                        })
                      }
                      allBlocks={allBlocks}
                    />
                  </ListGroup.Item>
                </>
              )
            )}
          <div
            className={cx(styles.actions, {
              [styles.biggerActions]: showBiggerActionButtons,
              [styles.subPipelineNode]: !isRootPipeline,
            })}
          >
            {showAddBlock && (
              <BrickModal
                bricks={relevantBlocksToAdd}
                renderButton={(onClick) => (
                  <TooltipIconButton
                    name={`add-node-${nodeIndex}`}
                    icon={faPlusCircle}
                    onClick={onClick}
                    tooltipText="Add a brick"
                  />
                )}
                selectCaption={addBrickCaption}
                onSelect={(block) => {
                  addBlock(block, pipelinePath, nodeIndex + 1);
                }}
              />
            )}
            {showPaste && (
              <TooltipIconButton
                name={`paste-brick-${nodeIndex}`}
                icon={faPaste}
                onClick={() => {
                  pasteBlock(pipelinePath, nodeIndex);
                }}
                tooltipText="Paste copied brick"
              />
            )}
          </div>
          {showAddMessage && (
            <p className={styles.appendInfo}>
              <small className="text-muted">
                Add more bricks with the plus button
              </small>
            </p>
          )}
        </React.Fragment>
      );
    },
    [
      activeNodeId,
      addBlock,
      allBlocks,
      collapsedState,
      isApiAtLeastV2,
      moveBlockDown,
      moveBlockUp,
      pasteBlock,
      relevantBlocksToAdd,
      setActiveNodeId,
    ]
  );

  return (renderProps) => renderNode({ ...renderProps, pipelinePath: "" });
}
