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
import { EditorNodeProps } from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { ListGroup } from "react-bootstrap";
import { RenderProps } from "@/pageEditor/tabs/editTab/nodeAdapterTypes";
import { TypedBlockMap } from "@/blocks/registry";
import { useSelector } from "react-redux";
import { selectPipelineMap } from "@/pageEditor/slices/editorSelectors";
import { isEmpty } from "lodash";

const EditorNodeLayout: React.FC<{
  nodes: EditorNodeProps[];
  renderNode: (renderProps: RenderProps) => React.ReactNode;
  allBlocks: TypedBlockMap;
}> = ({ nodes, renderNode, allBlocks }) => {
  const lastIndex = nodes.length - 1;
  // eslint-disable-next-line security/detect-object-injection -- just created this variable
  const lastBlockPipelineId = nodes[lastIndex]?.blockId;
  const lastBlock = lastBlockPipelineId
    ? allBlocks.get(lastBlockPipelineId)
    : undefined;
  const showAppend = !lastBlock?.block || lastBlock.type !== "renderer";

  return (
    <ListGroup variant="flush">
      {nodes.length > 0 &&
        nodes.map((nodeProps, nodeIndex) =>
          renderNode({
            nodeProps,
            nodeIndex,
            lastIndex,
            showAppend,
          })
        )}
    </ListGroup>
  );
};

export default React.memo(EditorNodeLayout);
