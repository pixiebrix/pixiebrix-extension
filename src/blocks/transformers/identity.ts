/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Transformer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";

export class IdentityTransformer extends Transformer {
  constructor() {
    super(
      "@pixiebrix/identity",
      "Identity function",
      "Returns the object passed into it",
      "faCode"
    );
  }

  inputSchema: Schema = {
    type: "object",
    additionalProperties: true,
  };

  async transform(arg: BlockArg): Promise<BlockArg> {
    return arg;
  }
}

registerBlock(new IdentityTransformer());
