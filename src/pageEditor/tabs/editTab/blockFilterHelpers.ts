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
import { BlockType } from "@/runtime/runtimeTypes";
import { ExtensionPointType } from "@/extensionPoints/types";
import { PipelineType } from "@/pageEditor/pageEditorTypes";
import { split, stubTrue } from "lodash";
import { BlockConfig } from "@/blocks/types";
import { DocumentRenderer } from "@/blocks/renderers/document";

const PANEL_TYPES = ["actionPanel", "panel"];

const alwaysShow = new Set([
  // Cancel/Error provide meaningful control flow for all bricks
  validateRegistryId("@pixiebrix/cancel"),
  validateRegistryId("@pixiebrix/error"),
]);

export type IsBlockAllowedPredicate = (block: TypedBlock) => boolean;

export function makeIsAllowedForRootPipeline(
  extensionPointType: ExtensionPointType
) {
  const excludeType: BlockType = PANEL_TYPES.includes(extensionPointType)
    ? "effect"
    : "renderer";

  return ({ type, block }: TypedBlock) =>
    (type != null && type !== excludeType) || alwaysShow.has(block.id);
}

export function makeBlockFilterPredicate(
  pipelineType: PipelineType,
  pipelinePath: string,
  extensionPointType: ExtensionPointType
): IsBlockAllowedPredicate {
  if (pipelineType === PipelineType.Root) {
    return makeIsAllowedForRootPipeline(extensionPointType);
  }

  let isButton = false;

  if (pipelineType === PipelineType.DocumentBuilder) {
    // We need to find the pipeline prop name, assume path ends with .<propName>.__value__
    const parts = split(pipelinePath, ".");
    if (parts.length >= 3) {
      const propName = parts[-2];
      if (propName === "onClick") {
        isButton = true;
      }
    }
  }

  // PixieBrix doesn't currently support renderers in control flow
  // bricks or document builder buttons. Use a brick element to render
  // something in the document builder.
  if (pipelineType === PipelineType.ControlFlow || isButton) {
    return (block: TypedBlock) => block.type !== "renderer";
  }

  return stubTrue;
}

type GetPipelineTypeArgs = {
  extensionPointType: ExtensionPointType;
  pipelinePath: string;
  parentNode: BlockConfig;
};

export function makeIsBlockAllowedForPipeline({
  extensionPointType,
  pipelinePath,
  parentNode,
}: GetPipelineTypeArgs) {
  if (parentNode == null) {
    // Root pipeline, look at the extensionPointType
    return makeIsAllowedForRootPipeline(extensionPointType);
  }

  if (
    parentNode.id !== DocumentRenderer.BLOCK_ID ||
    pipelinePath.split(".").at(-2) === "onClick"
  ) {
    // Exclude renderers from effect sub pipeline (control flow or document builder buttons)
    return ({ type }: TypedBlock) => type != null && type !== "renderer";
  }

  return stubTrue;
}
