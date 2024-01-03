/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type TypedBrickPair } from "@/bricks/registry";
import { type StarterBrickType } from "@/types/starterBrickTypes";
import { PipelineFlavor } from "@/pageEditor/pageEditorTypes";
import { stubTrue } from "lodash";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { type BrickType } from "@/runtime/runtimeTypes";
import DisplayTemporaryInfo from "@/bricks/transformers/temporaryInfo/DisplayTemporaryInfo";
import { type RegistryId } from "@/types/registryTypes";
import TourStepTransformer from "@/bricks/transformers/tourStep/tourStep";
import { ErrorEffect } from "@/bricks/effects/error";
import { CancelEffect } from "@/bricks/effects/cancel";
import CommentEffect from "@/bricks/effects/comment";

const PANEL_TYPES = ["actionPanel", "panel"];

const ALWAYS_SHOW = new Set([
  // Cancel/Error provide meaningful control flow for all bricks
  CancelEffect.BRICK_ID,
  ErrorEffect.BRICK_ID,
  CommentEffect.BRICK_ID,
]);

export type IsBlockAllowedPredicate = (block: TypedBrickPair) => boolean;

export function getRootPipelineFlavor(extensionPointType: StarterBrickType) {
  if (PANEL_TYPES.includes(extensionPointType)) {
    return PipelineFlavor.NoEffect;
  }

  return PipelineFlavor.NoRenderer;
}

export function getSubPipelineFlavor(
  parentNodeId: RegistryId,
  pipelinePath: string,
): PipelineFlavor {
  if (
    parentNodeId === DocumentRenderer.BLOCK_ID &&
    pipelinePath.split(".").at(-2) === "pipeline"
  ) {
    // Current pipeline is the Brick sub pipeline of a Document renderer.
    // Since this sub pipeline is a renderer by itself, it should have no side effects
    return PipelineFlavor.NoEffect;
  }

  if (parentNodeId === DisplayTemporaryInfo.BRICK_ID) {
    // Temporary Info renderer shouldn't have side effects
    return PipelineFlavor.NoEffect;
  }

  if (parentNodeId === TourStepTransformer.BRICK_ID) {
    const pathParts = pipelinePath.split(".");
    if (pathParts.at(-2) === "body") {
      // Tour step body should have no side effects
      return PipelineFlavor.NoEffect;
    }

    // Don't allow renderer in onBeforeShow/onAfterShow
    return PipelineFlavor.NoRenderer;
  }

  return PipelineFlavor.NoRenderer;
}

export function makeIsBlockAllowedForPipeline(
  pipelineFlavor: PipelineFlavor,
): IsBlockAllowedPredicate {
  if (pipelineFlavor === PipelineFlavor.AllBlocks) {
    return stubTrue;
  }

  let excludedType: BrickType;

  switch (pipelineFlavor) {
    case PipelineFlavor.NoEffect: {
      excludedType = "effect";
      break;
    }

    case PipelineFlavor.NoRenderer: {
      excludedType = "renderer";
      break;
    }

    default: {
      console.warn(
        "Unknown pipeline flavor, allowing all bricks",
        pipelineFlavor,
      );
      return stubTrue;
    }
  }

  return ({ type, block }: TypedBrickPair) =>
    type !== excludedType || ALWAYS_SHOW.has(block.id);
}
