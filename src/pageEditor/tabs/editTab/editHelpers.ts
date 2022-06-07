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

import { IBlock, OutputKey, RegistryId, SafeString } from "@/core";
import { freshIdentifier, joinName } from "@/utils";
import { selectReaderIds } from "@/blocks/readers/readerUtils";
import getType from "@/runtime/getType";
import { BlockType } from "@/runtime/runtimeTypes";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { getPipelinePropNames } from "@/pageEditor/utils";
import { BlockPipeline, BlockConfig } from "@/blocks/types";
import { PipelineMap } from "@/pageEditor/uiState/uiStateTypes";
import { get } from "lodash";

export function collectRegistryIds(form: FormState): RegistryId[] {
  return [
    form.extensionPoint.metadata.id,
    ...selectReaderIds(form.extensionPoint.definition.reader),
    ...form.services.map((x) => x.id),
    ...form.extension.blockPipeline.map((x) => x.id),
  ];
}

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

function traversePipeline(
  blockPipeline: BlockPipeline,
  parentPath: string,
  action: (
    blockConfig: BlockConfig,
    index: number,
    path: string,
    pipelinePath: string,
    pipeline: BlockPipeline
  ) => void
) {
  for (const [index, blockConfig] of Object.entries(blockPipeline)) {
    const fieldName = joinName(parentPath, index);
    action(blockConfig, Number(index), fieldName, parentPath, blockPipeline);

    for (const subPipelineField of getPipelinePropNames(blockConfig)) {
      const subPipelineAccessor = ["config", subPipelineField, "__value__"];
      const subPipeline = get(blockConfig, subPipelineAccessor);
      traversePipeline(
        subPipeline,
        joinName(fieldName, ...subPipelineAccessor),
        action
      );
    }
  }
}

export function getPipelineMap(blockPipeline: BlockPipeline) {
  const pipelineMap: PipelineMap = {};
  traversePipeline(
    blockPipeline,
    "extension.blockPipeline",
    (blockConfig, index, path, pipelinePath, pipeline) => {
      pipelineMap[blockConfig.instanceId] = {
        blockId: blockConfig.id,
        path,
        blockConfig,
        index,
        pipelinePath,
        pipeline,
      };
    }
  );

  return pipelineMap;
}
