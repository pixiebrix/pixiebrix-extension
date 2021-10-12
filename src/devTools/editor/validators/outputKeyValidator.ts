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

import { BlockPipeline } from "@/blocks/types";
import { BlockType, getType } from "@/blocks/util";
import { IBlock } from "@/core";
import { joinName } from "@/utils";
import { set } from "lodash";

const outputKeyRegex = /^[A-Za-z][\dA-Za-z]*$/;

const blockTypesWithEmptyOutputKey: BlockType[] = ["effect", "renderer"];

function setOutputKeyError(
  pipelineErrors: Record<string, unknown>,
  blockIndex: number,
  errorMessage: string
) {
  const propertyNameInPipeline = joinName(String(blockIndex), "outputKey");
  set(pipelineErrors, propertyNameInPipeline, errorMessage);
}

async function getPipelineBlockTypes(
  pipeline: BlockPipeline,
  allBlocks: IBlock[]
) {
  return Promise.all(
    pipeline
      .map(({ id }) => allBlocks.find((block) => block.id === id))
      .map(async (block) => (block ? getType(block) : null))
  );
}

async function outputKeyValidator(
  pipelineErrors: Record<string, unknown>,
  pipeline: BlockPipeline,
  allBlocks: IBlock[]
) {
  // No blocks, no validation
  if (pipeline.length === 0 || allBlocks.length === 0) {
    return;
  }

  const blockTypes = await getPipelineBlockTypes(pipeline, allBlocks);

  for (let blockIndex = 0; blockIndex !== pipeline.length; ++blockIndex) {
    let errorMessage: string;
    const pipelineBlock = pipeline[blockIndex];
    const blockType = blockTypes[blockIndex];

    if (blockTypesWithEmptyOutputKey.includes(blockType)) {
      if (!pipelineBlock.outputKey) {
        continue;
      }

      errorMessage = `OutputKey must be empty for ${blockType} block.`;
    } else if (!pipelineBlock.outputKey) {
      errorMessage = "This field is required.";
    } else if (outputKeyRegex.test(pipelineBlock.outputKey)) {
      continue;
    } else {
      errorMessage =
        "Must start with a letter and only include letters and numbers.";
    }

    setOutputKeyError(pipelineErrors, blockIndex, errorMessage);
  }
}

export default outputKeyValidator;
