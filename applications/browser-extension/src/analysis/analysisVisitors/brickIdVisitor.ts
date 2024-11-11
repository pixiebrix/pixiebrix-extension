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

import PipelineVisitor, {
  type VisitBlockExtra,
} from "@/bricks/PipelineVisitor";
import { type RegistryId } from "@/types/registryTypes";
import { type BrickConfig, type BrickPosition } from "@/bricks/types";
import { castArray } from "lodash";

/**
 * A visitor that recursively collects all block IDs used in a pipeline.
 *
 * Typically, should be called as BlockIdVisitor.collectBlockIds
 *
 * @see BrickIdVisitor.collectBrickIds
 */
class BrickIdVisitor extends PipelineVisitor {
  readonly _brickIds = new Set<RegistryId>();

  get brickIds(): Set<RegistryId> {
    return new Set(this._brickIds);
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    super.visitBrick(position, blockConfig, extra);
    this._brickIds.add(blockConfig.id);
  }

  public static collectBrickIds(
    pipeline: BrickConfig | BrickConfig[],
  ): Set<RegistryId> {
    const visitor = new BrickIdVisitor();
    visitor.visitRootPipeline(castArray(pipeline));
    return visitor.brickIds;
  }
}

export default BrickIdVisitor;
