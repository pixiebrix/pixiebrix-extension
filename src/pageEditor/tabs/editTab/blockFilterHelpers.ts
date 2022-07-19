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
import { PipelineFlavour } from "@/pageEditor/pageEditorTypes";
import { stubTrue } from "lodash";
import { BlockConfig } from "@/blocks/types";
import { DocumentRenderer } from "@/blocks/renderers/document";
import { BlockType } from "@/runtime/runtimeTypes";

const PANEL_TYPES = ["actionPanel", "panel"];

const alwaysShow = new Set([
  // Cancel/Error provide meaningful control flow for all bricks
  validateRegistryId("@pixiebrix/cancel"),
  validateRegistryId("@pixiebrix/error"),
]);

export type IsBlockAllowedPredicate = (block: TypedBlock) => boolean;

export function getRootPipelineFlavour(extensionPointType: ExtensionPointType) {
  if (PANEL_TYPES.includes(extensionPointType)) {
    return PipelineFlavour.NoEffect;
  }

  return PipelineFlavour.NoRenderer;
}

type GetPipelineFlavourArgs = {
  extensionPointType: ExtensionPointType;
  pipelinePath: string;
  parentNode: BlockConfig;
};
export function getPipelineFlavour({
  extensionPointType,
  pipelinePath,
  parentNode,
}: GetPipelineFlavourArgs): PipelineFlavour {
  if (parentNode == null) {
    // Root pipeline
    return getRootPipelineFlavour(extensionPointType);
  }

  if (
    parentNode.id === DocumentRenderer.BLOCK_ID &&
    pipelinePath.split(".").at(-2) === "pipeline"
  ) {
    // Document Brick pipeline, it renders, should have no side effects
    return PipelineFlavour.NoEffect;
  }

  return PipelineFlavour.NoRenderer;
}

export function makeIsBlockAllowedForPipeline(
  pipelineFlavour: PipelineFlavour
) {
  if (pipelineFlavour === PipelineFlavour.Any) {
    return stubTrue;
  }

  const excludeType: BlockType =
    pipelineFlavour === PipelineFlavour.NoEffect ? "effect" : "renderer";

  return ({ type, block }: TypedBlock) =>
    type !== excludeType || alwaysShow.has(block.id);
}
