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

import { Effect } from "@/types";
import { BlockArg, Schema } from "@/core";
import { registerBlock } from "@/blocks/registry";
import { BusinessError } from "@/errors";

export class ErrorEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/error",
      "Raises a business error",
      "Raise a business error to end the flow"
    );
  }

  inputSchema: Schema = {
    type: "object",

    properties: {
      message: {
        type: "string",
        description: "Optional error message",
      },
    },
  };

  async effect({ message }: BlockArg): Promise<void> {
    throw new BusinessError(message ?? "Unknown business error");
  }
}

registerBlock(new ErrorEffect());
