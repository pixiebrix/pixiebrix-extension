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

import { TypedBlock } from "@/blocks/registry";
import { validateRegistryId } from "@/types/helpers";
import { ExtensionPointType } from "@/extensionPoints/types";
import { PipelineFlavor } from "@/pageEditor/pageEditorTypes";
import { stubTrue } from "lodash";
import { BlockConfig } from "@/blocks/types";
import { DocumentRenderer } from "@/blocks/renderers/document";
import { BlockType } from "@/runtime/runtimeTypes";
import { RegistryId } from "@/core";

const PANEL_TYPES = ["actionPanel", "panel"];

const alwaysShow = new Set([
  // Cancel/Error provide meaningful control flow for all bricks
  validateRegistryId("@pixiebrix/cancel"),
  validateRegistryId("@pixiebrix/error"),
]);

export type IsBlockAllowedPredicate = (block: TypedBlock) => boolean;

export function getRootPipelineFlavor(extensionPointType: ExtensionPointType) {
  if (PANEL_TYPES.includes(extensionPointType)) {
    return PipelineFlavor.NoEffect;
  }

  return PipelineFlavor.NoRenderer;
}

export function getSubPipelineFlavor(
  parentNodeId: RegistryId,
  pipelinePath: string
): PipelineFlavor {
  if (
    parentNodeId === DocumentRenderer.BLOCK_ID &&
    pipelinePath.split(".").at(-2) === "pipeline"
  ) {
    // Current pipeline is the Brick sub pipeline of a Document renderer.
    // Since this sub pipeline is a renderer by itself, it should have no side effects
    return PipelineFlavor.NoEffect;
  }

  return PipelineFlavor.NoRenderer;
}

type GetPipelineFlavorArgs = {
  extensionPointType: ExtensionPointType;
  pipelinePath: string;
  parentNode: BlockConfig;
};
export function getPipelineFlavor({
  extensionPointType,
  parentNode,
  pipelinePath,
}: GetPipelineFlavorArgs): PipelineFlavor {
  if (parentNode == null) {
    return getRootPipelineFlavor(extensionPointType);
  }

  return getSubPipelineFlavor(parentNode.id, pipelinePath);
}

export function makeIsBlockAllowedForPipeline(pipelineFlavor: PipelineFlavor) {
  if (pipelineFlavor === PipelineFlavor.AllBlocks) {
    return stubTrue;
  }

  let excludedType: BlockType;

  switch (pipelineFlavor) {
    case PipelineFlavor.NoEffect:
      excludedType = "effect";
      break;
    case PipelineFlavor.NoRenderer:
      excludedType = "renderer";
      break;
    default:
      console.warn(
        "Unknown pipeline flavor, allowing all bricks",
        pipelineFlavor
      );
      return stubTrue;
  }

  return ({ type, block }: TypedBlock) =>
    type !== excludedType || alwaysShow.has(block.id);
}
