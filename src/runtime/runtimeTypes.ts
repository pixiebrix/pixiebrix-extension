/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { BlockConfig } from "@/blocks/types";
import { BlockArg, IBlock } from "@/core";
import { BlockType } from "@/blocks/util";

/**
 * A block configuration with the corresponding resolved IBlock and BlockType.
 * @see BlockConfig
 * @see BlockPipeline
 * @see BlockType
 */
export type ResolvedBlockConfig = {
  config: BlockConfig;
  block: IBlock;
  type: BlockType;
};

/**
 * Assume that a value matches the expected arg for any block.
 */
export function unsafeAssumeValidArg(value: unknown): BlockArg {
  return value as BlockArg;
}
