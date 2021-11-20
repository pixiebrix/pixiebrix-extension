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
import styles from "./EditorNodeLayout.module.scss";
import EditorNode, {
  EditorNodeProps,
} from "@/devTools/editor/tabs/editTab/editorNode/EditorNode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faPlus,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { IBlock, RegistryId, UUID } from "@/core";
import BlockModal from "@/components/brickModal/BrickModal";
import useBrickRecommendations from "@/devTools/editor/tabs/editTab/useBrickRecommendations";
import cx from "classnames";

function renderAppend(onClick: () => void, addRightMargin: boolean) {
  return (
    <div
      className={cx(styles.appendContainer, {
        [styles.addRightMargin]: addRightMargin,
      })}
    >
      <FontAwesomeIcon
        icon={faArrowDown}
        size="lg"
        className={styles.appendArrow}
      />
      <EditorNode muted title="Add" icon={faPlus} onClick={onClick} />
    </div>
  );
}

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
  addBlock: (block: IBlock, beforeInstanceId?: UUID) => void;
  showAppend: boolean;
  moveBlockUp: (instanceId: UUID) => void;
  moveBlockDown: (instanceId: UUID) => void;
}> = ({
  nodes,
  activeNodeId,
  relevantBlocksToAdd,
  addBlock,
  showAppend,
  moveBlockUp,
  moveBlockDown,
}) => {
  const recommendations: RegistryId[] = useBrickRecommendations();

  function renderInsert(onClick: () => void, addRightMargin: boolean) {
    return (
      // Don't use bootstrap styling
      <button
        type="button"
        onClick={onClick}
        className={cx(styles.insertButton, {
          [styles.addRightMargin]: addRightMargin,
        })}
      >
        <FontAwesomeIcon
          icon={faPlusCircle}
          size="lg"
          className={styles.plus}
        />
      </button>
    );
  }

  const canMoveAnything = nodes.length > 2;

  return (
    <div className={styles.root}>
      {nodes.length > 0 &&
        nodes.map((nodeProps, index) => {
          const { nodeId } = nodeProps;
          // Editor nodes are displayed from top to bottom in array order,
          // so, "up" is lower in the array, and "down" is higher in the array.
          // Also, you cannot move the foundation node, which is always at
          // index 0.
          if (nodeId !== FOUNDATION_NODE_ID) {
            nodeProps.canMoveUp = index > 1; // Any nodes beyond the first non-foundation node
            nodeProps.canMoveDown = index > 0 && index + 1 < nodes.length; // Not the first and not the last
            nodeProps.onClickMoveUp = () => {
              moveBlockUp(nodeId);
            };

            nodeProps.onClickMoveDown = () => {
              moveBlockDown(nodeId);
            };
          }

          return (
            <React.Fragment key={index}>
              {nodeId !== FOUNDATION_NODE_ID && (
                <BlockModal
                  bricks={relevantBlocksToAdd}
                  renderButton={(onClick) =>
                    renderInsert(onClick, canMoveAnything)
                  }
                  recommendations={recommendations}
                  selectCaption={addBrickCaption}
                  onSelect={(block) => {
                    addBlock(block, nodeId);
                  }}
                />
              )}
              <EditorNode
                active={nodeId === activeNodeId}
                canMoveAnything={canMoveAnything}
                {...nodeProps}
              />
            </React.Fragment>
          );
        })}
      {showAppend && (
        <BlockModal
          bricks={relevantBlocksToAdd}
          renderButton={(onClick) => renderAppend(onClick, canMoveAnything)}
          recommendations={recommendations}
          selectCaption={addBrickCaption}
          onSelect={addBlock}
        />
      )}
    </div>
  );
};

export default React.memo(EditorNodeLayout);
