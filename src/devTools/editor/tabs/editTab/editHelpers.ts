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

import { IBlock, SafeString } from "@/core";
import { getType } from "@/blocks/util";
import { freshIdentifier } from "@/utils";

/**
 * Generate a fresh outputKey for `block`
 * @param block the block
 * @param outputKeys existing outputKeys already being used
 */
export async function generateFreshOutputKey(
  block: IBlock,
  outputKeys: string[]
): Promise<string> {
  const root = block.defaultOutputKey ?? (await getType(block));

  return freshIdentifier(root as SafeString, outputKeys);
}
