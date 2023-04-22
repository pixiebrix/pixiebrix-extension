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

import PipelineVisitor, {
  type VisitBlockExtra,
} from "@/blocks/PipelineVisitor";
import { type RegistryId } from "@/types/registryTypes";
import { type BlockConfig, type BlockPosition } from "@/blocks/types";
import { castArray } from "lodash";

/**
 * A visitor that recursively collects all block IDs used in a pipeline.
 *
 * Typically should be called as BlockIdVisitor.collectBlockIds
 *
 * @see BlockIdVisitor.collectBlockIds
 */
class BlockIdVisitor extends PipelineVisitor {
  readonly _blockIds = new Set<RegistryId>();

  get blockIds(): Set<RegistryId> {
    return new Set(this._blockIds);
  }

  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ): void {
    super.visitBlock(position, blockConfig, extra);
    this._blockIds.add(blockConfig.id);
  }

  public static collectBlockIds(
    pipeline: BlockConfig | BlockConfig[]
  ): Set<RegistryId> {
    const visitor = new BlockIdVisitor();
    visitor.visitRootPipeline(castArray(pipeline));
    return visitor.blockIds;
  }
}

export default BlockIdVisitor;
