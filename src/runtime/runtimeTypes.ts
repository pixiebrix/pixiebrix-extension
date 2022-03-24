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

import { BlockConfig } from "@/blocks/types";
import { BlockArg, IBlock, OutputKey, RegistryId } from "@/core";

export type BlockType = "reader" | "effect" | "transform" | "renderer";
/**
 * A block configuration with the corresponding resolved IBlock and BlockType.
 * @see BlockConfig
 * @see BlockType
 */
export type ResolvedBlockConfig = {
  block: IBlock;
  config: BlockConfig;
  type: BlockType;
};

/**
 * Information required to display a renderer
 */
export type RendererPayload = {
  /**
   * The registry id of the renderer block, e.g., @pixiebrix/table
   */
  blockId: RegistryId;
  /**
   * A unique id for the content, used control re-rendering (similar to `key` in React)
   */
  key: string;
  /**
   * The BlockArg to pass to the renderer
   * @see BlockProps.args
   * @see BlockArg
   */
  args: unknown;
  /**
   * The context to pass to the renderer
   * @see BlockProps.context
   * @see BlockOptions
   */
  ctxt: unknown;
};

/**
 * Assume that a value matches the expected arg for any block.
 *
 * For use in tests and JavaScript bricks that manually create a call to an individual brick.
 */
export function unsafeAssumeValidArg(value: unknown): BlockArg {
  return value as BlockArg;
}

const OUTPUT_KEY_REGEX = /[A-Z_a-z]\w{0,30}/;

export function validateOutputKey(key: string): OutputKey {
  if (OUTPUT_KEY_REGEX.test(key)) {
    return key as OutputKey;
  }

  throw new TypeError("Not a valid output key");
}
