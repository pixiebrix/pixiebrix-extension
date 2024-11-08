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

import getType from "../../../runtime/getType";
import {
  type BrickConfig,
  type BrickPipeline,
  type BrickPosition,
} from "@/bricks/types";
import { type PipelineMap } from "../../store/editor/uiStateTypes";
import PipelineVisitor, {
  type VisitBlockExtra,
} from "@/bricks/PipelineVisitor";
import { type OutputKey } from "../../../types/runtimeTypes";
import { type Brick } from "../../../types/brickTypes";
import { type SafeString } from "../../../types/stringTypes";
import { freshIdentifier } from "../../../utils/variableUtils";
import { assertNotNullish } from "../../../utils/nullishUtils";
import { brickTypeSupportsOutputKey } from "../../../runtime/runtimeUtils";

/**
 * Default brick output key, if the brick doesn't define its own default output key.
 */
const DEFAULT_OUTPUT_KEY = "output" as SafeString;

/**
 * Generate a fresh outputKey for `brick`
 * @param brick the brick
 * @param outputKeys existing outputKeys already being used
 */
export async function generateFreshOutputKey(
  brick: Brick,
  outputKeys: OutputKey[],
): Promise<OutputKey | undefined> {
  // In practice, getType will always be able to infer a type. However, if the brick directly extends
  // BrickABC so there's only a run method (e.g., in test cases), then getType will return null.
  const type = (await getType(brick)) ?? "transform";

  if (!brickTypeSupportsOutputKey(type)) {
    // Output keys for effects are ignored by the runtime (and generate a warning at runtime)
    return undefined;
  }

  if (brick.defaultOutputKey) {
    return freshIdentifier(
      brick.defaultOutputKey as SafeString,
      outputKeys,
    ) as OutputKey;
  }

  if (["reader", "transform"].includes(type)) {
    return freshIdentifier(DEFAULT_OUTPUT_KEY, outputKeys) as OutputKey;
  }

  return freshIdentifier(type as SafeString, outputKeys) as OutputKey;
}

class PipelineMapVisitor extends PipelineVisitor {
  private readonly map: PipelineMap = {};
  get pipelineMap(): PipelineMap {
    return this.map;
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    assertNotNullish(blockConfig.instanceId, "Block instanceId is missing");
    this.pipelineMap[blockConfig.instanceId] = {
      blockId: blockConfig.id,
      path: position.path,
      blockConfig,
      index: extra.index,
      pipeline: extra.pipeline,
      pipelinePath: extra.pipelinePosition.path,
      parentNodeId: extra.parentNodeId,
    };

    super.visitBrick(position, blockConfig, extra);
  }
}

export function getPipelineMap(pipeline: BrickPipeline): PipelineMap {
  const visitor = new PipelineMapVisitor();
  visitor.visitRootPipeline(pipeline);
  return visitor.pipelineMap;
}
