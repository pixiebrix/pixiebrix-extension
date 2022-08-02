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

import { traversePipeline } from "@/pageEditor/utils";
import { DocumentRenderer } from "@/blocks/renderers/document";
import { UUID } from "@/core";
import { isAnyOf } from "@reduxjs/toolkit";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveElement,
  selectErrorMap,
} from "@/pageEditor/slices/editorSelectors";
import blockRegistry from "@/blocks/registry";
import { Validator, ValidatorEffect } from "./validationTypes";

export const MULTIPLE_RENDERERS_ERROR_MESSAGE =
  "A panel can only have one renderer. There are one or more renderers configured after this brick.";
export const RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE =
  "A renderer must be the last brick.";

class RenderersValidator implements Validator {
  static namespace = "renderers";

  matcher = isAnyOf(
    editorActions.addNode,
    editorActions.moveNode,
    editorActions.removeNode
  );

  effect: ValidatorEffect = async (action, listenerApi) => {
    const state = listenerApi.getState();
    const activeElement = selectActiveElement(state);
    const extensionPointType = activeElement.extensionPoint.definition.type;

    if (
      extensionPointType !== "actionPanel" &&
      extensionPointType !== "panel"
    ) {
      return;
    }

    const errorMap = selectErrorMap(state);

    /**
     * Node IDs that have errors since the last run
     */
    const lastNodesWithErrors: UUID[] = Object.entries(errorMap)
      .filter(([, errorInfo]) =>
        errorInfo?.errors?.some(
          (x) => x.namespace === RenderersValidator.namespace
        )
      )
      .map(([nodeId]) => nodeId as UUID);

    const allBlocks = await blockRegistry.allTyped();
    const nodesWithErrors = new Set<UUID>();
    traversePipeline({
      pipeline: activeElement.extension.blockPipeline,
      visitPipeline({ pipeline, pipelinePath, parentNode }) {
        const isRootPipeline = parentNode === null;

        // Only run validation for root pipeline and document Brick sub pipeline
        // Because control flow sub pipelines and document button sub pipeline can't have a renderer
        if (
          !isRootPipeline &&
          (parentNode.id !== DocumentRenderer.BLOCK_ID ||
            // The Brick element will have "pipeline" as a key in the config (i.e. in pipelinePath)
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
            nodesWithErrors.add(pipelineBlock.instanceId);

            listenerApi.dispatch(
              editorActions.setNodeError({
                nodeId: pipelineBlock.instanceId,
                namespace: RenderersValidator.namespace,
                message: blockErrors.join(" "),
              })
            );
          }
        }
      },
    });

    // Clear the errors from the last run for the blocks that do not longer have errors
    for (const nodeId of lastNodesWithErrors.filter(
      (x) => !nodesWithErrors.has(x)
    )) {
      listenerApi.dispatch(
        editorActions.clearNodeError({
          nodeId,
          namespace: RenderersValidator.namespace,
        })
      );
    }
  };
}

export default RenderersValidator;
