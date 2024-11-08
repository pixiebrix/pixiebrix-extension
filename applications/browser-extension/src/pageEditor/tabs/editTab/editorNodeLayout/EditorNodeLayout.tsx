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

import React from "react";
import { ListGroup } from "react-bootstrap";
import BrickNode from "../editorNodes/brickNode/BrickNode";
import PipelineHeaderNode, {
  type PipelineHeaderNodeProps,
} from "../editorNodes/PipelineHeaderNode";
import PipelineFooterNode, {
  type PipelineFooterNodeProps,
} from "../editorNodes/PipelineFooterNode";
import { type BrickNodeProps } from "../editTabTypes";
import { FOUNDATION_NODE_ID } from "../../../store/editor/uiState";
import usePipelineNodes from "./usePipelineNodes";

const EditorNodeLayout: React.FC = () => {
  const { foundationNodeProps, nodes } = usePipelineNodes();

  return (
    <ListGroup variant="flush" data-testid="editor-node-layout">
      <BrickNode key={FOUNDATION_NODE_ID} {...foundationNodeProps} />
      {nodes.map(({ type, key, ...nodeProps }) => {
        switch (type) {
          case "brick": {
            return <BrickNode key={key} {...(nodeProps as BrickNodeProps)} />;
          }

          case "header": {
            return (
              <PipelineHeaderNode
                key={key}
                {...(nodeProps as PipelineHeaderNodeProps)}
              />
            );
          }

          case "footer": {
            return (
              <PipelineFooterNode
                key={key}
                {...(nodeProps as PipelineFooterNodeProps)}
              />
            );
          }

          default: {
            // Impossible code branch
            const exhaustiveCheck: never = type;
            throw new Error(`Unexpected type: ${exhaustiveCheck}`);
          }
        }
      })}
    </ListGroup>
  );
};

export default React.memo(EditorNodeLayout);
