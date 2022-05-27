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
import { isPipelineExpression, PipelineExpression } from "@/runtime/mapArgs";
import { produce } from "immer";

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
            throw new Error('ForEach "body" must be a pipeline');
          }

          return produce(blockConfig, (draft) => {
            draft.instanceId = uuidv4();
            // At this point we're sure the body is a pipeline
            const bodyPipeline = draft.config.body as PipelineExpression;
            bodyPipeline.__value__ = withInstanceIds(bodyPipeline.__value__);
          });

        case IfElse.BLOCK_ID:
          if (!isPipelineExpression(blockConfig.config.if)) {
            throw new Error('IfElse "if" must be a pipeline');
          }

          if (
            blockConfig.config.else != null &&
            !isPipelineExpression(blockConfig.config.else)
          ) {
            throw new Error('IfElse "else" must be a pipeline');
          }

          return produce(blockConfig, (draft) => {
            draft.instanceId = uuidv4();
            // At this point we're sure the if and else are pipelines
            const ifPipeline = draft.config.if as PipelineExpression;
            ifPipeline.__value__ = withInstanceIds(ifPipeline.__value__);
            if (draft.config.else != null) {
              const elsePipeline = draft.config.else as PipelineExpression;
              elsePipeline.__value__ = withInstanceIds(elsePipeline.__value__);
            }
          });

        case TryExcept.BLOCK_ID:
          if (!isPipelineExpression(blockConfig.config.try)) {
            throw new Error('TryExcept "try" must be a pipeline');
          }

          if (
            blockConfig.config.except != null &&
            !isPipelineExpression(blockConfig.config.except)
          ) {
            throw new Error('TryExcept "except" must be a pipeline');
          }

          return produce(blockConfig, (draft) => {
            draft.instanceId = uuidv4();
            // At this point we're sure the try and except are pipelines
            const tryPipeline = draft.config.try as PipelineExpression;
            tryPipeline.__value__ = withInstanceIds(tryPipeline.__value__);
            if (draft.config.except != null) {
              const exceptPipeline = draft.config.except as PipelineExpression;
              exceptPipeline.__value__ = withInstanceIds(
                exceptPipeline.__value__
              );
            }
          });

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
