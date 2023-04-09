/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { freshIdentifier } from "@/utils";
import getType from "@/runtime/getType";
import { type BlockType } from "@/runtime/runtimeTypes";
import {
  type BlockConfig,
  type BlockPipeline,
  type BlockPosition,
} from "@/blocks/types";
import { type PipelineMap } from "@/pageEditor/uiState/uiStateTypes";
import PipelineVisitor, {
  type VisitBlockExtra,
} from "@/blocks/PipelineVisitor";
import { type OutputKey } from "@/types/runtimeTypes";
import { type IBlock } from "@/types/blockTypes";
import { type SafeString } from "@/types/stringTypes";

export function showOutputKey(blockType: BlockType): boolean {
  return blockType !== "effect" && blockType !== "renderer";
}

/**
 * Generate a fresh outputKey for `block`
 * @param block the block
 * @param outputKeys existing outputKeys already being used
 */
export async function generateFreshOutputKey(
  block: IBlock,
  outputKeys: OutputKey[]
): Promise<OutputKey | undefined> {
  const type = await getType(block);

  if (!showOutputKey(type)) {
    // Output keys for effects are ignored by the runtime (and generate a warning at runtime)
    return undefined;
  }

  if (block.defaultOutputKey) {
    return freshIdentifier(
      block.defaultOutputKey as SafeString,
      outputKeys
    ) as OutputKey;
  }

  if (type === "reader") {
    return freshIdentifier("data" as SafeString, outputKeys) as OutputKey;
  }

  if (type === "transform") {
    return freshIdentifier(
      "transformed" as SafeString,
      outputKeys
    ) as OutputKey;
  }

  return freshIdentifier(type as SafeString, outputKeys) as OutputKey;
}

class PipelineMapVisitor extends PipelineVisitor {
  private readonly map: PipelineMap = {};
  get pipelineMap(): PipelineMap {
    return this.map;
  }

  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ): void {
    this.pipelineMap[blockConfig.instanceId] = {
      blockId: blockConfig.id,
      path: position.path,
      blockConfig,
      index: extra.index,
      pipeline: extra.pipeline,
      pipelinePath: extra.pipelinePosition.path,
      parentNodeId: extra.parentNodeId,
    };

    super.visitBlock(position, blockConfig, extra);
  }
}

export function getPipelineMap(pipeline: BlockPipeline): PipelineMap {
  const visitor = new PipelineMapVisitor();
  visitor.visitRootPipeline(pipeline);
  return visitor.pipelineMap;
}
