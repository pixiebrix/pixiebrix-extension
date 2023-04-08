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

import { type JsonObject } from "type-fest";
import { Block, type IBlock } from "@/types/blockTypes";
import { type BlockArg, type ReaderRoot } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";

/**
 * A block that can read data from a page or part of the page.
 */
export interface IReader extends IBlock {
  /** Return true if the Reader is for a page/element. */
  isAvailable: ($elements?: JQuery) => Promise<boolean>;

  read: (root: ReaderRoot) => Promise<JsonObject>;
}

export abstract class Reader extends Block implements IReader {
  readonly inputSchema: Schema = {};

  override outputSchema: Schema = undefined;

  override async isRootAware(): Promise<boolean> {
    // Most readers use the root, so have them opt-out if they don't
    return true;
  }

  abstract isAvailable($elements?: JQuery): Promise<boolean>;

  abstract read(root: HTMLElement | Document): Promise<JsonObject>;

  async run({ root }: BlockArg): Promise<JsonObject> {
    return this.read(root);
  }
}
