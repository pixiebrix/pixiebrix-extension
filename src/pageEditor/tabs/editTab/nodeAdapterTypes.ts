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

import { IBlock, UUID } from "@/core";
import { EditorNodeProps } from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { Except } from "type-fest";
import { TypedBlockMap } from "@/blocks/registry";

/**
 * These props do not depend on which node is being rendered
 */
export type NodeAdapterProps = {
  addBlock: (
    block: IBlock,
    pipelinePath: string,
    pipelineIndex: number
  ) => void;
  moveBlockUp: (instanceId: UUID) => void;
  moveBlockDown: (instanceId: UUID) => void;
  pasteBlock?: (pipelinePath: string, pipelineIndex: number) => void;
  relevantBlocksToAdd: IBlock[];
  allBlocks: TypedBlockMap;
};

/**
 * These props depend on which node is being rendered, so they need to be
 * passed in to the render function itself.
 */
export type InnerRenderProps = {
  pipelinePath: string;
  nodeProps: EditorNodeProps;
  nodeIndex: number;
  lastIndex: number;
  showAppend: boolean;
};

/**
 * The adapter manages the pipelinePath prop internally
 */
export type RenderProps = Except<InnerRenderProps, "pipelinePath">;
