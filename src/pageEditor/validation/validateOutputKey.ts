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

import { BlockPipeline } from "@/blocks/types";
import { joinName } from "@/utils";
import { isEmpty, set } from "lodash";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { TypedBlockMap } from "@/blocks/registry";
import { BlockType } from "@/runtime/runtimeTypes";
import { traversePipeline } from "@/pageEditor/utils";

const outputKeyRegex = /^[A-Za-z][\dA-Za-z]*$/;

const blockTypesWithEmptyOutputKey: BlockType[] = ["effect", "renderer"];

function setOutputKeyError(
  pipelineErrors: FormikErrorTree,
  blockPath: string,
  errorMessage: string
) {
  const propertyNameInPipeline = joinName(blockPath, "outputKey");
  set(pipelineErrors, propertyNameInPipeline, errorMessage);
}

function validateOutputKey(
  pipelineErrors: FormikErrorTree,
  pipeline: BlockPipeline,
  allBlocks: TypedBlockMap
) {
  // No blocks, no validation
  if (pipeline.length === 0 || isEmpty(allBlocks)) {
    return;
  }

  traversePipeline({
    blockPipeline: pipeline,
    visitBlock({ blockConfig, path }) {
      let errorMessage: string;
      const { id, outputKey } = blockConfig;
      const blockType = allBlocks.get(id)?.type;
      if (blockTypesWithEmptyOutputKey.includes(blockType)) {
        if (!outputKey) {
          return;
        }

        errorMessage = `OutputKey must be empty for "${blockType}" block.`;
      } else if (!outputKey) {
        errorMessage = "This field is required.";
      } else if (outputKeyRegex.test(outputKey)) {
        return;
      } else {
        errorMessage =
          "Must start with a letter and only include letters and numbers.";
      }

      setOutputKeyError(pipelineErrors, path, errorMessage);
    },
  });
}

export default validateOutputKey;
