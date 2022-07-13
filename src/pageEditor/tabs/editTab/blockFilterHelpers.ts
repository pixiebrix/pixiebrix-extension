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
import { PipelineType } from "@/pageEditor/pageEditorTypes";
import { stubTrue } from "lodash";
import { BlockConfig } from "@/blocks/types";
import { DocumentRenderer } from "@/blocks/renderers/document";

const PANEL_TYPES = ["actionPanel", "panel"];

const alwaysShow = new Set([
  // Cancel/Error provide meaningful control flow for all bricks
  validateRegistryId("@pixiebrix/cancel"),
  validateRegistryId("@pixiebrix/error"),
]);

export type IsBlockAllowedPredicate = (block: TypedBlock) => boolean;

export function getRootPipelineType(extensionPointType: ExtensionPointType) {
  if (PANEL_TYPES.includes(extensionPointType)) {
    return PipelineType.Renderer;
  }

  return PipelineType.Effect;
}

type GetPipelineTypeArgs = {
  extensionPointType: ExtensionPointType;
  pipelinePath: string;
  parentNode: BlockConfig;
};
export function getPipelineType({
  extensionPointType,
  pipelinePath,
  parentNode,
}: GetPipelineTypeArgs): PipelineType {
  if (parentNode == null) {
    // Root pipeline
    return getRootPipelineType(extensionPointType);
  }

  if (
    parentNode.id !== DocumentRenderer.BLOCK_ID ||
    pipelinePath.split(".").at(-2) === "onClick"
  ) {
    // Effect pipeline
    return PipelineType.Effect;
  }

  return PipelineType.Renderer;
}

export function makeIsBlockAllowedForPipeline(pipelineType: PipelineType) {
  if (pipelineType === PipelineType.Effect) {
    return ({ type, block }: TypedBlock) =>
      (type != null && type !== "renderer") || alwaysShow.has(block.id);
  }

  return stubTrue;
}
