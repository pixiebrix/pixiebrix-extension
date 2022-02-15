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
import styles from "./EditorNodeLayout.module.scss";
import EditorNode, {
  EditorNodeProps,
} from "@/devTools/editor/tabs/editTab/editorNode/EditorNode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaste,
  faPlus,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { IBlock, RegistryId, UUID } from "@/core";
import BlockModal from "@/components/brickModal/BrickModal";
import useBrickRecommendations from "@/devTools/editor/tabs/editTab/useBrickRecommendations";
import cx from "classnames";
import TooltipIconButton from "@/components/TooltipIconButton";
import useApiVersionAtLeast from "@/devTools/editor/hooks/useApiVersionAtLeast";
import { ListGroup } from "react-bootstrap";

const addBrickCaption = (
  <span>
    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add brick
  </span>
);

export type NodeId = UUID;

export const FOUNDATION_NODE_ID = "foundation" as UUID;

const EditorNodeLayout: React.FC<{
  nodes: EditorNodeProps[];
  activeNodeId: NodeId;
  relevantBlocksToAdd: IBlock[];
  addBlock: (block: IBlock, pipelineIndex: number) => void;
  showAppend: boolean;
  moveBlockUp: (instanceId: UUID) => void;
  moveBlockDown: (instanceId: UUID) => void;
  pasteBlock?: (pipelineIndex: number) => void;
}> = ({
  nodes,
  activeNodeId,
  relevantBlocksToAdd,
  addBlock,
  showAppend,
  moveBlockUp,
  moveBlockDown,
  pasteBlock,
}) => {
  const recommendations: RegistryId[] = useBrickRecommendations();
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");

  const canMoveAnything = nodes.length > 2;
  const finalIndex = nodes.length - 1;

  return (
    <ListGroup variant="flush">
      {nodes.length > 0 &&
        nodes.map((nodeProps, index) => {
          const { nodeId } = nodeProps;
          // Editor nodes are displayed from top to bottom in array order,
          // so, "up" is lower in the array, and "down" is higher in the array.
          // Also, you cannot move the foundation node, which is always at
          // index 0.
          if (nodeId !== FOUNDATION_NODE_ID) {
            nodeProps.canMoveUp = index > 1; // Any nodes beyond the first non-foundation node
            nodeProps.canMoveDown = index > 0 && index < finalIndex; // Not the first and not the last
            nodeProps.onClickMoveUp = () => {
              moveBlockUp(nodeId);
            };

            nodeProps.onClickMoveDown = () => {
              moveBlockDown(nodeId);
            };
          }

          const showAddBlock =
            isApiAtLeastV2 && (index < finalIndex || showAppend);
          const isFinal = index === finalIndex;
          const showAddMessage = showAddBlock && isFinal;
          const showPaste = pasteBlock && isApiAtLeastV2;

          return (
            <React.Fragment key={nodeId}>
              <EditorNode
                active={nodeId === activeNodeId}
                canMoveAnything={canMoveAnything}
                {...nodeProps}
              />
              <div
                className={cx(styles.actions, {
                  [styles.finalActions]: isFinal,
                })}
              >
                {showAddBlock && (
                  <BlockModal
                    bricks={relevantBlocksToAdd}
                    renderButton={(onClick) => (
                      <TooltipIconButton
                        name={`add-node-${index}`}
                        icon={faPlusCircle}
                        onClick={onClick}
                        tooltipText="Add a brick"
                      />
                    )}
                    recommendations={recommendations}
                    selectCaption={addBrickCaption}
                    onSelect={(block) => {
                      addBlock(block, index);
                    }}
                  />
                )}
                {showPaste && (
                  <TooltipIconButton
                    name={`paste-brick-${index}`}
                    icon={faPaste}
                    onClick={() => {
                      pasteBlock(index);
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
