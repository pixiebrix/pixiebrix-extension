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
import { isPipelineExpression } from "@/runtime/mapArgs";
import { produce } from "immer";
import { WritableDraft } from "immer/dist/types/types-external";
import { getPipelinePropNames } from "@/pageEditor/utils";

function normalizePipelineDraft(pipeline: WritableDraft<BlockPipeline>) {
  for (const block of pipeline) {
    block.instanceId = uuidv4();

    const pipelineProps = getPipelinePropNames(block);
    for (const prop of pipelineProps) {
      const pipeline = block.config[prop];
      if (isPipelineExpression(pipeline)) {
        normalizePipelineDraft(pipeline.__value__);
      } else {
        // Normalizing am empty pipeline
        block.config[prop] = {
          __type__: "pipeline",
          __value__: [],
        };
      }
    }
  }
}

/**
 * Enrich a BlockPipeline with instanceIds for use in tracing
 * and normalize sub pipelines
 */
export function normalizePipelineForEditor(
  pipeline: BlockPipeline
): BlockPipeline {
  return produce(pipeline, normalizePipelineDraft);
}

function omitMetaInPipelineDraft(pipeline: WritableDraft<BlockPipeline>) {
  for (const block of pipeline) {
    delete block.instanceId;

    const pipelineProps = getPipelinePropNames(block);
    for (const prop of pipelineProps) {
      const pipeline = block.config[prop];
      if (isPipelineExpression(pipeline)) {
        omitMetaInPipelineDraft(pipeline.__value__);
      }
    }
  }
}

/**
 * Remove the automatically generated tracing ids.
 */
export function omitEditorMetadata(pipeline: BlockPipeline): BlockPipeline {
  return produce(pipeline, omitMetaInPipelineDraft);
}
