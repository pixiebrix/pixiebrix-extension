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

import { uuidv4 } from "@/types/helpers";
import { BlockPipeline } from "@/blocks/types";
import ForEach from "@/blocks/transformers/controlFlow/ForEach";
import IfElse from "@/blocks/transformers/controlFlow/IfElse";
import TryExcept from "@/blocks/transformers/controlFlow/TryExcept";
import { isPipelineExpression } from "@/runtime/mapArgs";

// TODO: Support other blocks
const subPipelineBlocks = new Set([
  ForEach.BLOCK_ID,
  IfElse.BLOCK_ID,
  TryExcept.BLOCK_ID,
]);
/**
 * Enrich a BlockPipeline with instanceIds for use in tracing.
 */

export function withInstanceIds(blocks: BlockPipeline): BlockPipeline {
  return blocks.map((blockConfig) => {
    if (subPipelineBlocks.has(blockConfig.id)) {
      switch (blockConfig.id) {
        case ForEach.BLOCK_ID:
          if (!isPipelineExpression(blockConfig.config.body)) {
            throw new Error("ForEach body must be a pipeline");
          }

          // TODO Can not assign to readonly property here
          blockConfig.config.body.__value__ = withInstanceIds(
            blockConfig.config.body.__value__
          );
          break;

        case IfElse.BLOCK_ID:
          if (!isPipelineExpression(blockConfig.config.if)) {
            throw new Error("IfElse if must be a pipeline");
          }
          if (!isPipelineExpression(blockConfig.config.else)) {
            throw new Error("IfElse else must be a pipeline");
          }

          blockConfig.config.if.__value__ = withInstanceIds(
            blockConfig.config.if.__value__
          );
          blockConfig.config.else.__value__ = withInstanceIds(
            blockConfig.config.else.__value__
          );
          break;
        default:
          throw "not supported";
      }
    }

    return {
      ...blockConfig,
      instanceId: uuidv4(),
    };
  });
}
