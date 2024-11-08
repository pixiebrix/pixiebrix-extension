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

import { type TypedBrickPair } from "./registry";
import {
  type StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import { stubTrue } from "lodash";
import { DocumentRenderer } from "./renderers/document";
import { type BrickType, BrickTypes } from "../runtime/runtimeTypes";
import DisplayTemporaryInfo from "./transformers/temporaryInfo/DisplayTemporaryInfo";
import { type RegistryId } from "@/types/registryTypes";
import { ErrorEffect } from "./effects/error";
import CancelEffect from "./effects/CancelEffect";
import CommentEffect from "./effects/comment";
import { PipelineFlavor } from "./types";

const PANEL_TYPES = [StarterBrickTypes.SIDEBAR_PANEL];

const ALWAYS_SHOW = new Set([
  // Cancel/Error provide meaningful control flow for all bricks
  CancelEffect.BRICK_ID,
  ErrorEffect.BRICK_ID,
  CommentEffect.BRICK_ID,
]);

export type IsBrickAllowedPredicate = (block: TypedBrickPair) => boolean;

export function getRootPipelineFlavor(starterBrickType: StarterBrickType) {
  if (PANEL_TYPES.includes(starterBrickType)) {
    return PipelineFlavor.NoEffect;
  }

  return PipelineFlavor.NoRenderer;
}

export function getSubPipelineFlavor(
  parentNodeId: RegistryId,
  pipelinePath: string,
): PipelineFlavor {
  if (
    parentNodeId === DocumentRenderer.BRICK_ID &&
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

  return PipelineFlavor.NoRenderer;
}

export function makeIsBrickAllowedForPipeline(
  pipelineFlavor: PipelineFlavor,
): IsBrickAllowedPredicate {
  if (pipelineFlavor === PipelineFlavor.AllBricks) {
    return stubTrue;
  }

  let excludedType: BrickType;

  switch (pipelineFlavor) {
    case PipelineFlavor.NoEffect: {
      excludedType = BrickTypes.EFFECT;
      break;
    }

    case PipelineFlavor.NoRenderer: {
      excludedType = BrickTypes.RENDERER;
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
