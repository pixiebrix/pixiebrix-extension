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
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import { TypedBlockMap } from "@/blocks/registry";
import { ExtensionPointType } from "@/extensionPoints/types";
import { traversePipeline } from "@/pageEditor/utils";
import { setPipelineBlockError } from "./setPipelineBlockError";
import { DocumentRenderer } from "@/blocks/renderers/document";

export const MULTIPLE_RENDERERS_ERROR_MESSAGE =
  "A panel can only have one renderer. There are one or more renderers configured after this brick.";
export const RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE =
  "A renderer must be the last brick.";

function validateRenderers(
  pipelineErrors: FormikErrorTree,
  extensionPipeline: BlockPipeline,
  allBlocks: TypedBlockMap,
  extensionPointType: ExtensionPointType
) {
  if (extensionPointType !== "actionPanel" && extensionPointType !== "panel") {
    return;
  }

  traversePipeline({
    pipeline: extensionPipeline,
    visitPipeline({ pipeline, pipelinePath, parentNode }) {
      console.log("validate renderer", {
        parentNode,
        pipelinePath,
      });

      const isRootPipeline = parentNode === null;
      // Only run validation for root pipeline and document Brick sub pipeline
      if (
        !isRootPipeline &&
        (parentNode.id !== DocumentRenderer.BLOCK_ID ||
          pipelinePath.split(".").at(-2) !== "pipeline")
      ) {
        return;
      }

      let hasRenderer = false;
      for (
        let blockIndex = pipeline.length - 1;
        blockIndex >= 0;
        --blockIndex
      ) {
        const pipelineBlock = pipeline.at(blockIndex);
        const blockType = allBlocks.get(pipelineBlock.id)?.type;
        const blockErrors = [];

        if (blockType !== "renderer") {
          continue;
        }

        if (hasRenderer) {
          blockErrors.push(MULTIPLE_RENDERERS_ERROR_MESSAGE);
        } else {
          hasRenderer = true;
        }

        if (blockIndex !== pipeline.length - 1) {
          blockErrors.push(RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE);
        }

        if (blockErrors.length > 0) {
          setPipelineBlockError(
            pipelineErrors,
            blockErrors.join(" "),
            pipelinePath,
            String(blockIndex)
          );
        }
      }
    },
  });
}

export default validateRenderers;
