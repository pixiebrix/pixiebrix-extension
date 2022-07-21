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
import { UUID } from "@/core";
import { isAnyOf } from "@reduxjs/toolkit";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveElement,
  selectErrorMap,
} from "@/pageEditor/slices/editorSelectors";
import blockRegistry from "@/blocks/registry";
import { Validator, ValidatorEffect } from "./validationTypes";
import {
  getPipelineFlavor,
  makeIsBlockAllowedForPipeline,
} from "@/pageEditor/tabs/editTab/blockFilterHelpers";
import { ErrorLevel } from "@/pageEditor/uiState/uiStateTypes";

class BlockTypeValidator implements Validator {
  static namespace = "blockType";

  matcher = isAnyOf(editorActions.addNode);

  effect: ValidatorEffect = async (action, listenerApi) => {
    const state = listenerApi.getState();
    const activeElement = selectActiveElement(state);
    const extensionPointType = activeElement.extensionPoint.definition.type;
    const errorMap = selectErrorMap(state);

    /**
     * Node IDs that have errors since the last run
     */
    const lastNodesWithErrors: UUID[] = Object.entries(errorMap)
      .filter(([, errorInfo]) =>
        errorInfo?.errors?.some(
          (x) => x.namespace === BlockTypeValidator.namespace
        )
      )
      .map(([nodeId]) => nodeId as UUID);

    const allBlocks = await blockRegistry.allTyped();
    const nodesWithErrors = new Set<UUID>();
    traversePipeline({
      pipeline: activeElement.extension.blockPipeline,
      visitPipeline({ pipeline, pipelinePath, parentNode }) {
        const pipelineFlavor = getPipelineFlavor({
          extensionPointType,
          pipelinePath,
          parentNode,
        });
        const isBlockAllowedInPipeline =
          makeIsBlockAllowedForPipeline(pipelineFlavor);

        for (const pipelineBlock of pipeline) {
          const typedBlock = allBlocks.get(pipelineBlock.id);

          const isBlockAllowed = isBlockAllowedInPipeline(typedBlock);
          if (!isBlockAllowed) {
            nodesWithErrors.add(pipelineBlock.instanceId);

            listenerApi.dispatch(
              editorActions.setNodeError({
                nodeId: pipelineBlock.instanceId,
                namespace: BlockTypeValidator.namespace,
                message: `Block of type "${typedBlock.type}" is not allowed in this pipeline`,
                level: ErrorLevel.Critical,
              })
            );
          }
        }
      },
    });

    // Clear the errors from the last run for the blocks that no longer have errors
    for (const nodeId of lastNodesWithErrors.filter(
      (x) => !nodesWithErrors.has(x)
    )) {
      listenerApi.dispatch(
        editorActions.clearNodeError({
          nodeId,
          namespace: BlockTypeValidator.namespace,
        })
      );
    }
  };
}

export default BlockTypeValidator;
