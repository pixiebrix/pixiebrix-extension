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

import React, { useMemo } from "react";
import styles from "./EditorNodeLayout.module.scss";
import EditorNode, {
  EditorNodeProps,
  NodeId,
} from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaste,
  faPlus,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { IBlock, UUID } from "@/core";
import BrickModal from "@/components/brickModal/BrickModal";
import cx from "classnames";
import TooltipIconButton from "@/components/TooltipIconButton";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import { ListGroup } from "react-bootstrap";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { TypedBlockMap } from "@/blocks/registry";
import { useSelector } from "react-redux";
import { selectPipelineMap } from "@/pageEditor/slices/editorSelectors";
import { isEmpty } from "lodash";

const addBrickCaption = (
  <span>
    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add brick
  </span>
);

const EditorNodeLayout: React.FC<{
  nodes: EditorNodeProps[];
  allBlocks: TypedBlockMap;
  activeNodeId: NodeId;
  pipelinePath?: string;
  relevantBlocksToAdd: IBlock[];
  selectBlock: (instanceId: UUID) => void;
  addBlock: (
    block: IBlock,
    pipelinePath: string,
    pipelineIndex: number
  ) => void;
  moveBlockUp: (instanceId: UUID) => void;
  moveBlockDown: (instanceId: UUID) => void;
  pasteBlock: (pipelinePath: string, pipelineIndex: number) => void | null;
}> = ({
  nodes,
  allBlocks,
  activeNodeId,
  pipelinePath = "",
  relevantBlocksToAdd,
  selectBlock,
  addBlock,
  moveBlockUp,
  moveBlockDown,
  pasteBlock,
}) => {
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const pipelineMap = useSelector(selectPipelineMap);
  const isRootPipeline = isEmpty(pipelinePath);

  const canMoveAnything = isRootPipeline && nodes.length > 2;
  const finalIndex = nodes.length - 1;

  const lastBlockPipelineId = nodes[nodes.length - 1]?.blockId;
  const lastBlock = lastBlockPipelineId
    ? allBlocks.get(lastBlockPipelineId)
    : undefined;
  const showAppend = !lastBlock?.block || lastBlock.type !== "renderer";

  const allBlocksAsRelevant = useMemo(
    () => [...allBlocks.values()].map(({ block }) => block),
    [allBlocks]
  );

  return (
    <ListGroup variant="flush">
      {nodes.length > 0 &&
        nodes.map((nodeProps, nodeIndex) => {
          const { nodeId, children: childNodes } = nodeProps;
          const blockIndex =
            nodeId === FOUNDATION_NODE_ID ? -1 : pipelineMap[nodeId].index;

          // Editor nodes are displayed from top to bottom in array order,
          // so, "up" is lower in the array, and "down" is higher in the array.
          // Also, you cannot move the foundation node, which is always at
          // index 0.
          if (nodeId !== FOUNDATION_NODE_ID) {
            nodeProps.canMoveUp = nodeIndex > 1; // Any nodes beyond the first non-foundation node
            nodeProps.canMoveDown = nodeIndex > 0 && nodeIndex < finalIndex; // Not the first and not the last
            nodeProps.onClickMoveUp = () => {
              moveBlockUp(nodeId);
            };

            nodeProps.onClickMoveDown = () => {
              moveBlockDown(nodeId);
            };
          }

          const showAddBlock =
            isApiAtLeastV2 && (nodeIndex < finalIndex || showAppend);
          const showBiggerActionButtons =
            nodeIndex === finalIndex && isRootPipeline;
          const showAddMessage = showAddBlock && showBiggerActionButtons;
          const showPaste = pasteBlock && isApiAtLeastV2;

          return (
            <React.Fragment key={nodeId}>
              <EditorNode
                active={nodeId === activeNodeId}
                canMoveAnything={canMoveAnything}
                onClick={() => {
                  selectBlock(nodeId);
                }}
                {...nodeProps}
              />
              {childNodes?.length > 0 &&
                childNodes.map(
                  (
                    { label, pipelinePath: subPipelinePath, nodes: childNodes },
                    index
                  ) => (
                    <ListGroup.Item
                      key={`${subPipelinePath}-${index}`}
                      as="div"
                      className={styles.subPipelineContainer}
                    >
                      <ListGroup.Item className={styles.subPipelineLabel}>
                        {label}
                      </ListGroup.Item>
                      <div className={styles.actions}>
                        <BrickModal
                          bricks={allBlocksAsRelevant}
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
                        {showPaste && (
                          <TooltipIconButton
                            name={`paste-brick-${nodeIndex}`}
                            icon={faPaste}
                            onClick={() => {
                              pasteBlock(subPipelinePath, 0);
                            }}
                            tooltipText="Paste copied brick"
                          />
                        )}
                      </div>
                      <EditorNodeLayout
                        nodes={childNodes}
                        allBlocks={allBlocks}
                        activeNodeId={activeNodeId}
                        pipelinePath={subPipelinePath}
                        relevantBlocksToAdd={allBlocksAsRelevant}
                        selectBlock={selectBlock}
                        addBlock={addBlock}
                        moveBlockUp={null}
                        moveBlockDown={null}
                        pasteBlock={pasteBlock}
                      />
                    </ListGroup.Item>
                  )
                )}
              <div
                className={cx(styles.actions, {
                  [styles.biggerActions]: showBiggerActionButtons,
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
                      addBlock(block, pipelinePath, blockIndex + 1);
                    }}
                  />
                )}
                {showPaste && (
                  <TooltipIconButton
                    name={`paste-brick-${nodeIndex}`}
                    icon={faPaste}
                    onClick={() => {
                      pasteBlock(pipelinePath, blockIndex + 1);
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
        })}
    </ListGroup>
  );
};

export default React.memo(EditorNodeLayout);
