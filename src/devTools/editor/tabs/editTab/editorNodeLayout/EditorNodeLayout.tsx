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

import React, { useCallback } from "react";
import styles from "./EditorNodeLayout.module.scss";
import EditorNode, {
  EditorNodeProps,
  NodeId,
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

const renderAppend = ({ show }: { show: () => void }) => (
  <>
    <FontAwesomeIcon
      icon={faArrowDown}
      size="lg"
      className={styles.appendArrow}
    />
    <EditorNode
      muted
      title="Add"
      icon={faPlus}
      onClick={show}
      nodeId="append"
    />
  </>
);

const addBrickCaption = (
  <span>
    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add brick
  </span>
);

const EditorNodeLayout: React.FC<{
  nodes: EditorNodeProps[];
  activeNodeId: NodeId;
  relevantBlocksToAdd: IBlock[];
  addBlock: (block: IBlock, beforeInstanceId?: UUID) => void;
  showAppend: boolean;
}> = ({ nodes, activeNodeId, relevantBlocksToAdd, addBlock, showAppend }) => {
  const recommendations: RegistryId[] = useBrickRecommendations();

  const renderInsert = useCallback(
    ({ show }) => (
      // Don't use bootstrap styling
      <button type="button" className={styles.insertButton} onClick={show}>
        <FontAwesomeIcon
          icon={faPlusCircle}
          size="lg"
          className={styles.plus}
        />
      </button>
    ),
    []
  );

  return (
    <div className={styles.root}>
      {nodes.length > 0 &&
        nodes.map((nodeProps, index) => {
          const { nodeId } = nodeProps;
          return (
            <React.Fragment key={index}>
              {nodeId !== "foundation" && nodeId !== "append" && (
                <BlockModal
                  bricks={relevantBlocksToAdd}
                  renderButton={renderInsert}
                  recommendations={recommendations}
                  selectCaption={addBrickCaption}
                  onSelect={(block) => {
                    addBlock(block, nodeId);
                  }}
                />
              )}
              <EditorNode active={nodeId === activeNodeId} {...nodeProps} />
            </React.Fragment>
          );
        })}
      {showAppend && (
        <BlockModal
          bricks={relevantBlocksToAdd}
          renderButton={renderAppend}
          recommendations={recommendations}
          selectCaption={addBrickCaption}
          onSelect={addBlock}
        />
      )}
    </div>
  );
};

export default EditorNodeLayout;
