/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { DocumentRenderer } from "@/bricks/renderers/document";
import {
  type BrickConfig,
  type BrickPipeline,
  PipelineFlavor,
} from "@/bricks/types";
import {
  type DocumentBuilderElement,
  isButtonElement,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { type SubPipeline } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/types";
import {
  getDocumentBuilderPipelinePaths,
  getPipelinePropNames,
  getVariableKeyForSubPipeline,
} from "@/pageEditor/utils";
import { type Brick } from "@/types/brickTypes";
import { joinPathParts, joinName } from "@/utils/formUtils";
import { isEmpty, get } from "lodash";

export const ADD_MESSAGE = "Add more bricks with the plus button";

export function getBuilderPreviewElementId(
  brickConfig: BrickConfig,
  path: string,
): string | undefined {
  if (brickConfig.id === DocumentRenderer.BRICK_ID) {
    // The Document Preview element name is a substring of the header node path, e.g.
    // SubPipeline.path: config.body.0.children.9.children.0.children.0.config.onClick.__value__0.children.9.children.0.children.0
    // Document element: 0.children.9.children.0.children.0
    const regex = /config\.body\.(.*)\.config\..*$/;
    const result = regex.exec(path);
    if (result) {
      return result[1];
    }
  }
}

/**
 * @param block the block, or null if the resolved block is not available yet
 * @param blockConfig the block config
 */
export function getSubPipelinesForBlock(
  block: Brick | undefined,
  blockConfig: BrickConfig,
): SubPipeline[] {
  const subPipelines: SubPipeline[] = [];
  if (blockConfig.id === DocumentRenderer.BRICK_ID) {
    for (const docPipelinePath of getDocumentBuilderPipelinePaths(
      blockConfig,
    )) {
      const path = joinPathParts(docPipelinePath, "__value__");
      const pipeline: BrickPipeline = get(blockConfig, path) ?? [];

      // Removing the 'config.<pipelinePropName>' from the end of the docPipelinePath
      const elementPathParts = docPipelinePath.split(".").slice(0, -2);
      const docBuilderElement = get(
        blockConfig,
        elementPathParts,
      ) as DocumentBuilderElement;

      const isButton = isButtonElement(docBuilderElement);

      let subPipelineLabel = docBuilderElement.config.label as string;
      if (isEmpty(subPipelineLabel)) {
        subPipelineLabel = isButton ? "button" : "brick";
      }

      subPipelines.push({
        headerLabel: subPipelineLabel,
        pipeline,
        path,
        flavor: isButton ? PipelineFlavor.NoRenderer : PipelineFlavor.NoEffect,
      });
    }
  } else {
    for (const pipelinePropName of getPipelinePropNames(block, blockConfig)) {
      const path = joinName("config", pipelinePropName, "__value__");
      const pipeline: BrickPipeline = get(blockConfig, path) ?? [];

      const subPipeline: SubPipeline = {
        headerLabel: pipelinePropName,
        pipeline,
        path,
        flavor: PipelineFlavor.NoRenderer,
      };

      const inputKey = getVariableKeyForSubPipeline(
        blockConfig,
        pipelinePropName,
      );

      if (inputKey) {
        subPipeline.inputKey = inputKey;
      }

      subPipelines.push(subPipeline);
    }
  }

  return subPipelines;
}
