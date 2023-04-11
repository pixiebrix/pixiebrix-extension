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

import { Block } from "@/types/blockTypes";
import { type BlockArgs, type BlockOptions } from "@/types/runtimeTypes";

export abstract class Transformer extends Block {
  override async isRootAware(): Promise<boolean> {
    // Most transformers don't use the root, so have them opt-in
    return false;
  }

  abstract transform(value: BlockArgs, options: BlockOptions): Promise<unknown>;

  async run(value: BlockArgs, options: BlockOptions): Promise<unknown> {
    return this.transform(value, options);
  }
}
