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
import { BlockConfig, BlockPipeline, BlockPosition } from "@/blocks/types";
import { isPipelineExpression } from "@/runtime/mapArgs";
import { produce } from "immer";
import { WritableDraft } from "immer/dist/types/types-external";
import { traversePipeline } from "@/pageEditor/utils";
import PipelineVisitor, {
  ROOT_POSITION,
  VisitResolvedBlockExtra,
} from "@/blocks/PipelineVisitor";
import pipelineSchema from "@schemas/pipeline.json";
import { PipelineFlavor } from "../pageEditorTypes";

class PipelineNormalizer extends PipelineVisitor {
  override async visitResolvedBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitResolvedBlockExtra
  ): Promise<void> {
    // Generate an instanceId for the block
    blockConfig.instanceId = uuidv4();

    // Initialize empty sub pipelines
    const propertiesSchema =
      extra.typedBlock.block?.inputSchema?.properties ?? {};
    const emptySubPipelineProperties = Object.entries(propertiesSchema)
      .filter(
        ([prop, fieldSchema]) =>
          typeof fieldSchema === "object" &&
          fieldSchema.$ref === pipelineSchema.$id &&
          !isPipelineExpression(blockConfig.config[prop])
      )
      .map(([prop]) => prop);
    for await (const prop of emptySubPipelineProperties) {
      blockConfig.config[prop] = {
        __type__: "pipeline",
        __value__: [],
      };
    }

    await super.visitResolvedBlock(position, blockConfig, extra);
  }
}

/**
 * Enrich a BlockPipeline with instanceIds for use in tracing
 * and normalize sub pipelines
 */
export async function normalizePipelineForEditor(
  pipeline: BlockPipeline
): Promise<BlockPipeline> {
  return produce(pipeline, async (pipeline: WritableDraft<BlockPipeline>) =>
    new PipelineNormalizer().visitPipeline(ROOT_POSITION, pipeline, {
      flavor: PipelineFlavor.AllBlocks,
    })
  );
}

/**
 * Remove the automatically generated tracing ids.
 */
export function omitEditorMetadata(pipeline: BlockPipeline): BlockPipeline {
  return produce(pipeline, (pipeline: WritableDraft<BlockPipeline>) => {
    traversePipeline({
      pipeline,
      visitBlock({ blockConfig }) {
        delete blockConfig.instanceId;
      },
    });
  });
}
