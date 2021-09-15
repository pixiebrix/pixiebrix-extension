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
} from "@/devTools/editor/tabs/editTab/editorNode/EditorNode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faPlus,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { IBlock } from "@/core";
import BlockModal from "@/components/fields/BlockModal";

const renderAppend = ({ show }: { show: () => void }) => (
  <>
    <FontAwesomeIcon
      icon={faArrowDown}
      size="lg"
      className={styles.appendArrow}
    />
    <EditorNode muted title="Add" icon={faPlus} onClick={show} />
  </>
);

const EditorNodeLayout: React.FC<{
  nodes: EditorNodeProps[];
  activeNodeIndex: number;
  relevantBlocksToAdd: IBlock[];
  addBlock: (block: IBlock, atIndex: number) => void;
  showAppend: boolean;
}> = ({
  nodes,
  activeNodeIndex,
  relevantBlocksToAdd,
  addBlock,
  showAppend,
}) => {
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
        nodes.map((nodeProps, index) => (
          <React.Fragment key={index}>
            {index !== 0 && (
              <BlockModal
                blocks={relevantBlocksToAdd}
                renderButton={renderInsert}
                onSelect={(block) => {
                  addBlock(block, index);
                }}
              />
            )}
            <EditorNode active={index === activeNodeIndex} {...nodeProps} />
          </React.Fragment>
        ))}
      {showAppend && (
        <BlockModal
          blocks={relevantBlocksToAdd}
          renderButton={renderAppend}
          onSelect={(block) => {
            addBlock(block, nodes.length);
          }}
        />
      )}
    </div>
  );
};

export default EditorNodeLayout;
