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

import { Transformer } from "@/types/blocks/transformerTypes";
import { type BlockArgs } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";

export class IdentityTransformer extends Transformer {
  override async isPure(): Promise<boolean> {
    return true;
  }

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

  async transform(arg: BlockArgs): Promise<BlockArgs> {
    return arg;
  }
}
